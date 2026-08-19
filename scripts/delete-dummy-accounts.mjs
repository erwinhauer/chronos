// Eenmalig opruimscript: verwijdert de meegeleverde demo/dummy-accounts en alles wat
// specifiek naar hen verwijst, op het project waar je het tegen aanroept.
//
// Volgorde is belangrijk: profiles.id heeft meerdere "restrict"-foreign keys (geen
// on-delete-cascade) vanuit factuuritems/tarieven/specificaties/auditlog — die rijen
// moeten eerst weg (of de kolom op null gezet, voor nullable velden op rijen die niet
// specifiek van deze gebruikers zijn) voordat het auth-account zelf verwijderd kan
// worden. team_members cascadet wel automatisch (on delete cascade), dus die hoeft niet
// apart behandeld te worden.
//
// Uitvoering: door de gebruiker zelf, lokaal, met env vars (nooit door mij gezet):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (van het project waar opgeruimd wordt)
// Voorbeeld:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-dummy-accounts.mjs

import { createClient } from "@supabase/supabase-js";

const DUMMY_EMAILS = [
  "vera.vermeer@chronos.local",
  "anna.aerts@chronos.local",
  "lucas.berg@chronos.local",
  "tom.teunissen@chronos.local",
  "fatima.faber@chronos.local",
  "bram.beheer@chronos.local",
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Ontbrekende env vars. Vereist: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`Ophalen van gebruikers mislukt: ${listError.message}`);

  const dummyIds = usersPage.users.filter((u) => DUMMY_EMAILS.includes(u.email)).map((u) => u.id);
  if (dummyIds.length === 0) {
    console.log("↺ Geen van de dummy-accounts gevonden op dit project — niets te doen.");
    return;
  }
  console.log(`Gevonden: ${dummyIds.length} van ${DUMMY_EMAILS.length} dummy-accounts.`);

  // Editor-referentie opschonen op items die NIET zelf verwijderd worden.
  const { error: laatstBewerktError } = await admin
    .from("factuuritems")
    .update({ laatst_bewerkt_door: null })
    .in("laatst_bewerkt_door", dummyIds)
    .not("medewerker_id", "in", `(${dummyIds.join(",")})`);
  if (laatstBewerktError) throw new Error(`Opschonen laatst_bewerkt_door mislukt: ${laatstBewerktError.message}`);

  const { error: factuuritemsError, count: factuuritemsCount } = await admin
    .from("factuuritems")
    .delete({ count: "exact" })
    .in("medewerker_id", dummyIds);
  if (factuuritemsError) throw new Error(`Verwijderen van factuuritems mislukt: ${factuuritemsError.message}`);
  console.log(`✓ factuuritems verwijderd: ${factuuritemsCount ?? 0} (factuuritem_dossiers cascadet automatisch)`);

  const { error: tarievenError, count: tarievenCount } = await admin
    .from("tarieven")
    .delete({ count: "exact" })
    .or(`medewerker_id.in.(${dummyIds.join(",")}),created_by.in.(${dummyIds.join(",")})`);
  if (tarievenError) throw new Error(`Verwijderen van tarieven mislukt: ${tarievenError.message}`);
  console.log(`✓ tarieven verwijderd: ${tarievenCount ?? 0}`);

  const { error: specificatiesError, count: specificatiesCount } = await admin
    .from("specificaties")
    .delete({ count: "exact" })
    .in("created_by", dummyIds);
  if (specificatiesError) throw new Error(`Verwijderen van specificaties mislukt: ${specificatiesError.message}`);
  console.log(`✓ specificaties verwijderd: ${specificatiesCount ?? 0}`);

  const { error: auditlogError, count: auditlogCount } = await admin
    .from("auditlog")
    .delete({ count: "exact" })
    .in("gebruiker_id", dummyIds);
  if (auditlogError) throw new Error(`Verwijderen van auditlog mislukt: ${auditlogError.message}`);
  console.log(`✓ auditlog verwijderd: ${auditlogCount ?? 0}`);

  const { error: batchesError, count: batchesCount } = await admin
    .from("facturatiebatches")
    .update({ goedgekeurd_door: null })
    .in("goedgekeurd_door", dummyIds)
    .select("id", { count: "exact" });
  if (batchesError) throw new Error(`Opschonen van facturatiebatches mislukt: ${batchesError.message}`);
  console.log(`✓ facturatiebatches (goedgekeurd_door genuld): ${batchesCount ?? 0}`);

  const { error: klantenError, count: klantenCount } = await admin
    .from("klanten")
    .update({ standaard_teamleider_id: null })
    .in("standaard_teamleider_id", dummyIds)
    .select("id", { count: "exact" });
  if (klantenError) throw new Error(`Opschonen van klanten mislukt: ${klantenError.message}`);
  console.log(`✓ klanten (standaard_teamleider_id genuld): ${klantenCount ?? 0}`);

  for (const id of dummyIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`Verwijderen van account ${id} mislukt: ${error.message}`);
  }
  console.log(`✓ ${dummyIds.length} dummy-accounts verwijderd (profiles + team_members cascaden automatisch).`);
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
