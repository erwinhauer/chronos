// Eenmalig migratiescript: kopieert alle productiedata van het OUDE Supabase-project
// naar het NIEUWE Supabase-project (Render-migratie), inclusief het opnieuw aanmaken
// van Auth-gebruikers.
//
// Waarom geen kale pg_dump/psql van het public-schema: profiles.id verwijst met een
// FK naar auth.users(id). Nieuwe Auth-accounts krijgen altijd een nieuwe, willekeurige
// UUID (auth.users is Supabase-intern, niet zomaar overschrijfbaar) — dus elke andere
// tabel die naar profiles.id verwijst (team_members, factuuritems, facturatiebatches,
// tarieven, specificaties, auditlog) moet die kolom herschrijven naar de NIEUWE id.
// Dit script bouwt daarom eerst een oude-id → nieuwe-id-mapping op basis van e-mailadres,
// en herschrijft daarna elke profiel-verwijzing tijdens het kopiëren.
//
// Uitvoering: door de gebruiker zelf, lokaal, met vier env vars (nooit door mij gezet):
//   OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY   (huidige/oude project)
//   NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY   (nieuwe project)
// Voorbeeld:
//   OLD_SUPABASE_URL=... OLD_SUPABASE_SERVICE_ROLE_KEY=... \
//   NEW_SUPABASE_URL=... NEW_SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-to-new-supabase.mjs
//
// Idempotent: draait op basis van upsert (onConflict "id"); opnieuw draaien na een
// gedeeltelijke mislukking dupliceert niets. Auth-gebruikers: als een e-mailadres al
// bestaat op het nieuwe project, wordt die hergebruikt in plaats van opnieuw aangemaakt.
//
// Vereist: nieuwe project moet eerst het schema hebben (zie migratieplan Fase A stap 2:
// `npx supabase link --project-ref <nieuw> && npx supabase db push --linked --yes`).

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(
    "Ontbrekende env vars. Vereist: OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PAGE_SIZE = 1000;
const CHUNK_SIZE = 500;

async function fetchAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Lezen van ${table} mislukt: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function upsertAll(table, rows) {
  if (rows.length === 0) {
    console.log(`↺ ${table}: niets te kopiëren.`);
    return;
  }
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await newDb.from(table).upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`Wegschrijven van ${table} mislukt: ${error.message}`);
  }
  console.log(`✓ ${table}: ${rows.length} rijen gekopieerd.`);
}

function remap(rows, idMap, columns) {
  return rows.map((row) => {
    const next = { ...row };
    for (const col of columns) {
      if (next[col] != null) next[col] = idMap.get(next[col]) ?? next[col];
    }
    return next;
  });
}

async function migrateAuthUsers() {
  const profiles = await fetchAll(oldDb, "profiles");
  const idMap = new Map();
  const resetLinks = [];

  const { data: existing, error: listError } = await newDb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`Ophalen van bestaande gebruikers op nieuw project mislukt: ${listError.message}`);
  const existingByEmail = new Map(existing.users.map((u) => [u.email, u.id]));

  for (const profile of profiles) {
    let newId = existingByEmail.get(profile.email);
    if (newId) {
      console.log(`↺ auth-account bestaat al: ${profile.email}`);
    } else {
      const tempWachtwoord = `Chronos-${crypto.randomBytes(9).toString("base64url")}`;
      const { data, error } = await newDb.auth.admin.createUser({
        email: profile.email,
        password: tempWachtwoord,
        email_confirm: true,
        user_metadata: { full_name: profile.full_name, role: profile.role },
      });
      if (error || !data.user) throw new Error(`Aanmaken van auth-account voor ${profile.email} mislukt: ${error?.message}`);
      newId = data.user.id;
      console.log(`✓ auth-account aangemaakt: ${profile.email}`);
    }
    idMap.set(profile.id, newId);

    // De trigger handle_new_user() zet al id/full_name/email/role; actief en
    // initialen komen daar niet uit mee, dus die backfillen we hier los.
    const { error: updateError } = await newDb
      .from("profiles")
      .update({ actief: profile.actief, initialen: profile.initialen })
      .eq("id", newId);
    if (updateError) throw new Error(`Bijwerken van profiel ${profile.email} mislukt: ${updateError.message}`);

    const { data: link, error: linkError } = await newDb.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
    });
    if (linkError) console.warn(`⚠ recovery-link voor ${profile.email} mislukt: ${linkError.message}`);
    else resetLinks.push({ email: profile.email, link: link.properties.action_link });
  }

  return { idMap, resetLinks };
}

async function main() {
  console.log("== Auth-gebruikers + profiles ==");
  const { idMap, resetLinks } = await migrateAuthUsers();

  console.log("\n== teams ==");
  await upsertAll("teams", await fetchAll(oldDb, "teams"));

  console.log("\n== team_members ==");
  await upsertAll("team_members", remap(await fetchAll(oldDb, "team_members"), idMap, ["profile_id"]));

  console.log("\n== klanten ==");
  await upsertAll("klanten", remap(await fetchAll(oldDb, "klanten"), idMap, ["standaard_teamleider_id"]));

  console.log("\n== projecten ==");
  await upsertAll("projecten", await fetchAll(oldDb, "projecten"));

  console.log("\n== tarieven ==");
  await upsertAll("tarieven", remap(await fetchAll(oldDb, "tarieven"), idMap, ["medewerker_id", "created_by"]));

  console.log("\n== facturatiebatches ==");
  await upsertAll("facturatiebatches", remap(await fetchAll(oldDb, "facturatiebatches"), idMap, ["goedgekeurd_door"]));

  console.log("\n== factuuritems ==");
  await upsertAll(
    "factuuritems",
    remap(await fetchAll(oldDb, "factuuritems"), idMap, ["medewerker_id", "laatst_bewerkt_door"])
  );

  console.log("\n== factuuritem_dossiers ==");
  await upsertAll("factuuritem_dossiers", await fetchAll(oldDb, "factuuritem_dossiers"));

  console.log("\n== specificaties ==");
  await upsertAll("specificaties", remap(await fetchAll(oldDb, "specificaties"), idMap, ["created_by"]));

  console.log("\n== teamdoelen ==");
  await upsertAll("teamdoelen", await fetchAll(oldDb, "teamdoelen"));

  console.log("\n== auditlog ==");
  await upsertAll("auditlog", remap(await fetchAll(oldDb, "auditlog"), idMap, ["gebruiker_id"]));

  console.log("\n== productchangelog ==");
  await upsertAll("productchangelog", await fetchAll(oldDb, "productchangelog"));

  console.log("\n== Klaar ==");
  console.log(`${idMap.size} gebruikers gemigreerd. Wachtwoord-resetlinks (1x geldig, stuur ze naar de collega's):`);
  for (const { email, link } of resetLinks) {
    console.log(`  ${email} → ${link}`);
  }
}

main().catch((error) => {
  console.error("\n✗ Migratie afgebroken:", error.message);
  process.exit(1);
});
