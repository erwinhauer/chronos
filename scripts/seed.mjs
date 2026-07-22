// Vult de lokale Supabase-instantie met demodata: gebruikers (per rol), teams,
// klanten, factuuritems en een paar facturatiebatches.
// Alleen bedoeld voor lokale ontwikkeling — gebruikt de vaste lokale service-role key uit `supabase start`.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEV_PASSWORD = "Chronos2026!";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "vera.vermeer@chronos.local", full_name: "Vera Vermeer", role: "medewerker" },
  { email: "anna.aerts@chronos.local", full_name: "Anna Aerts", role: "medewerker" },
  { email: "lucas.berg@chronos.local", full_name: "Lucas Berg", role: "medewerker" },
  { email: "tom.teunissen@chronos.local", full_name: "Tom Teunissen", role: "teamleider" },
  { email: "fatima.faber@chronos.local", full_name: "Fatima Faber", role: "finance" },
  { email: "bram.beheer@chronos.local", full_name: "Bram Beheer", role: "beheerder" },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function upsertUser(user) {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing?.users.find((u) => u.email === user.email);
  if (found) {
    console.log(`↺ bestaat al: ${user.email}`);
    return found.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.full_name, role: user.role },
  });
  if (error) throw error;
  console.log(`✓ aangemaakt: ${user.email} (${user.role})`);
  return data.user.id;
}

async function main() {
  const ids = {};
  for (const user of USERS) {
    ids[user.email] = await upsertUser(user);
  }

  const teamleiderId = ids["tom.teunissen@chronos.local"];
  const veraId = ids["vera.vermeer@chronos.local"];
  const annaId = ids["anna.aerts@chronos.local"];
  const lucasId = ids["lucas.berg@chronos.local"];

  const teams = [{ naam: "Team Benelux" }, { naam: "Team International" }];
  const { data: teamRows, error: teamError } = await admin
    .from("teams")
    .upsert(teams, { onConflict: "naam" })
    .select();
  if (teamError) throw teamError;
  console.log(`✓ teams: ${teamRows.map((t) => t.naam).join(", ")}`);

  const benelux = teamRows.find((t) => t.naam === "Team Benelux");
  const international = teamRows.find((t) => t.naam === "Team International");

  const teamLedenGewenst = [
    { team_id: benelux.id, profile_id: veraId },
    { team_id: benelux.id, profile_id: annaId },
    { team_id: benelux.id, profile_id: teamleiderId },
    { team_id: international.id, profile_id: lucasId },
    { team_id: international.id, profile_id: teamleiderId },
  ];

  const { data: bestaandeLeden, error: ledenLeesError } = await admin
    .from("team_members")
    .select("team_id, profile_id");
  if (ledenLeesError) throw ledenLeesError;

  const bestaandeLedenSleutels = new Set(bestaandeLeden.map((l) => `${l.team_id}|${l.profile_id}`));
  const nieuweLeden = teamLedenGewenst.filter((l) => !bestaandeLedenSleutels.has(`${l.team_id}|${l.profile_id}`));
  if (nieuweLeden.length > 0) {
    const { error: ledenError } = await admin.from("team_members").insert(nieuweLeden);
    if (ledenError) throw ledenError;
    console.log(`✓ teamleden: ${nieuweLeden.length} toegevoegd`);
  } else {
    console.log("↺ teamleden bestaan al");
  }

  const klanten = [
    {
      naam: "Arcadis",
      juridische_naam: "Arcadis N.V.",
      hubspot_id: "hs-arcadis-001",
      accountview_debiteurnummer: "10023",
      contactpersoon_naam: "Ellen de Groot",
      contact_email: "ellen.degroot@arcadis.com",
      specificatietaal: "en",
      specificatietype: "simple",
      kantoorkosten_actief: true,
      kolom_persoon_zichtbaar: true,
      kolom_uren_zichtbaar: true,
      kolom_externe_kosten_zichtbaar: false,
      kolom_korting_zichtbaar: false,
      standaard_teamleider_id: teamleiderId,
      valuta: "EUR",
      status: "actief",
    },
    {
      naam: "Lipton Teas & Infusions",
      juridische_naam: "Lipton Teas and Infusions Group B.V.",
      hubspot_id: "hs-lipton-001",
      accountview_debiteurnummer: "10041",
      contactpersoon_naam: "Mark van Dijk",
      contact_email: "mark.vandijk@liptonteas.com",
      specificatietaal: "en",
      specificatietype: "extended",
      kantoorkosten_actief: true,
      kolom_persoon_zichtbaar: true,
      kolom_uren_zichtbaar: false,
      kolom_externe_kosten_zichtbaar: true,
      kolom_korting_zichtbaar: true,
      standaard_teamleider_id: teamleiderId,
      valuta: "EUR",
      status: "actief",
    },
  ];

  const { data: klantRows, error: klantError } = await admin
    .from("klanten")
    .upsert(klanten, { onConflict: "hubspot_id" })
    .select();
  if (klantError) throw klantError;
  console.log(`✓ klanten: ${klantRows.map((k) => k.naam).join(", ")}`);

  const arcadis = klantRows.find((k) => k.naam === "Arcadis");
  const lipton = klantRows.find((k) => k.naam === "Lipton Teas & Infusions");

  const tarieven = [
    { klant_id: null, medewerker_id: null, tarief: 250, ingangsdatum: "2025-01-01" },
    { klant_id: null, medewerker_id: veraId, tarief: 300, ingangsdatum: "2025-01-01" },
    { klant_id: null, medewerker_id: annaId, tarief: 310, ingangsdatum: "2025-01-01" },
    { klant_id: null, medewerker_id: lucasId, tarief: 280, ingangsdatum: "2025-01-01" },
    { klant_id: arcadis.id, medewerker_id: null, tarief: 320, ingangsdatum: "2025-01-01" },
    { klant_id: lipton.id, medewerker_id: null, tarief: 170, ingangsdatum: "2025-01-01" },
    { klant_id: lipton.id, medewerker_id: lucasId, tarief: 190, ingangsdatum: "2025-01-01" },
  ];

  const { data: bestaandeTarieven, error: tariefLeesError } = await admin
    .from("tarieven")
    .select("klant_id, medewerker_id");
  if (tariefLeesError) throw tariefLeesError;

  const bestaandeSleutels = new Set(bestaandeTarieven.map((t) => `${t.klant_id ?? ""}|${t.medewerker_id ?? ""}`));
  const nieuweTarieven = tarieven.filter((t) => !bestaandeSleutels.has(`${t.klant_id ?? ""}|${t.medewerker_id ?? ""}`));

  if (nieuweTarieven.length > 0) {
    const { error: tariefError } = await admin.from("tarieven").insert(nieuweTarieven);
    if (tariefError) throw tariefError;
    console.log(`✓ tarieven: ${nieuweTarieven.length} toegevoegd`);
  } else {
    console.log("↺ tarieven bestaan al");
  }

  // Dossiernummer-opbouw (zie src/lib/dossiernummer.ts): prefix + nummer + landcode + suffix.
  // Statusmodel: alleen 'aangemaakt' (nog te wijzigen) of 'definitief' (gefactureerd).
  // Temporele spreiding over meerdere maanden (en één in het vorige jaar) zodat de
  // dashboardgrafiek ("omzet per teamlid, per maand/jaar") betekenisvolle data toont.
  const factuuritems = [
    {
      _batch: "arcadis-2026-h1",
      klant_id: arcadis.id,
      medewerker_id: veraId,
      dossiernummer: "TM93905GB00",
      type_dienst: "Merken",
      land: "GB",
      datum: "2026-06-15",
      omschrijving_klant: "Merkonderzoek en aanvraag GENX",
      eenheidstype: "uren",
      qty: 2.5,
      tarief: 300,
      honorarium: 750,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: null,
      klant_id: arcadis.id,
      medewerker_id: annaId,
      dossiernummer: "O26921PL00",
      type_dienst: "Opposities",
      land: "PL",
      datum: "2026-07-01",
      omschrijving_klant: "Oppositie ARCADIS ./. ARKADIS voorbereiden",
      eenheidstype: "uren",
      qty: 4,
      tarief: 310,
      honorarium: 1240,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "aangemaakt",
    },
    {
      _batch: "arcadis-2026-h1",
      klant_id: arcadis.id,
      medewerker_id: veraId,
      dossiernummer: "TM94010NL00",
      type_dienst: "Merken",
      land: "NL",
      datum: "2026-01-20",
      omschrijving_klant: "Merkregistratie GENX vervolgstap",
      eenheidstype: "uren",
      qty: 2,
      tarief: 300,
      honorarium: 600,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: "arcadis-2026-h1",
      klant_id: arcadis.id,
      medewerker_id: annaId,
      dossiernummer: "O27050DE00",
      type_dienst: "Opposities",
      land: "DE",
      datum: "2026-03-10",
      omschrijving_klant: "Oppositie voorbereiding Duitsland",
      eenheidstype: "uren",
      qty: 2.9,
      tarief: 310,
      honorarium: 900,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: "arcadis-2025-h2",
      klant_id: arcadis.id,
      medewerker_id: veraId,
      dossiernummer: "TM94500FR00",
      type_dienst: "Merken",
      land: "FR",
      datum: "2025-11-05",
      omschrijving_klant: "Merkonderzoek Frankrijk",
      eenheidstype: "uren",
      qty: 1.7,
      tarief: 300,
      honorarium: 500,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: null,
      klant_id: lipton.id,
      medewerker_id: lucasId,
      dossiernummer: "TM93669BD30",
      type_dienst: "Merken",
      land: "BD",
      datum: "2026-07-10",
      omschrijving_klant: "Registratie LIPTON YELLOW LABEL TEA (label)",
      eenheidstype: "uren",
      qty: 1.5,
      tarief: 190,
      honorarium: 285,
      externe_kosten: 45,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "aangemaakt",
    },
    {
      _batch: null,
      klant_id: lipton.id,
      medewerker_id: lucasId,
      dossiernummer: "TM102373US00",
      type_dienst: "Merken",
      land: "US",
      datum: "2026-06-20",
      omschrijving_klant: "Registratie ZEN voortzetten",
      eenheidstype: "uren",
      qty: 3,
      tarief: 190,
      honorarium: 570,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "aangemaakt",
    },
    {
      _batch: "lipton-2026-q2",
      klant_id: lipton.id,
      medewerker_id: annaId,
      dossiernummer: "O103109EU00",
      type_dienst: "Opposities",
      land: "EU",
      datum: "2026-05-05",
      omschrijving_klant: "Oppositie ELEPHANT ./. ELEPHANT BAY",
      eenheidstype: "uren",
      qty: 2,
      tarief: 170,
      honorarium: 340,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: "lipton-2026-q2",
      klant_id: lipton.id,
      medewerker_id: lucasId,
      dossiernummer: "TM95012JP00",
      type_dienst: "Merken",
      land: "JP",
      datum: "2026-02-14",
      omschrijving_klant: "Merkregistratie Japan",
      eenheidstype: "uren",
      qty: 4,
      tarief: 190,
      honorarium: 760,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
    {
      _batch: "lipton-2026-q2",
      klant_id: lipton.id,
      medewerker_id: annaId,
      dossiernummer: "TM95500CA00",
      type_dienst: "Merken",
      land: "CA",
      datum: "2026-04-08",
      omschrijving_klant: "Merkregistratie Canada",
      eenheidstype: "uren",
      qty: 1.4,
      tarief: 310,
      honorarium: 420,
      externe_kosten: 0,
      korting: 0,
      kantoorkosten_van_toepassing: true,
      declarabel: true,
      status: "definitief",
    },
  ];

  const { data: bestaandeItems, error: itemsLeesError } = await admin
    .from("factuuritems")
    .select("id, dossiernummer, medewerker_id, facturatiebatch_id");
  if (itemsLeesError) throw itemsLeesError;

  const bestaandeItemSleutels = new Map(
    bestaandeItems.map((i) => [`${i.dossiernummer}|${i.medewerker_id}`, i])
  );
  const nieuweItems = factuuritems.filter((i) => !bestaandeItemSleutels.has(`${i.dossiernummer}|${i.medewerker_id}`));

  if (nieuweItems.length > 0) {
    const { error: itemsError } = await admin.from("factuuritems").insert(
      nieuweItems.map((i) => {
        const rest = { ...i };
        delete rest._batch;
        return rest;
      })
    );
    if (itemsError) throw itemsError;
    console.log(`✓ factuuritems: ${nieuweItems.length} toegevoegd`);
  } else {
    console.log("↺ factuuritems bestaan al");
  }

  // Demo-facturatiebatches: groepeert de 'definitief' items per (klant, periode) —
  // idempotent op basis van of de items al een facturatiebatch_id hebben.
  const { data: alleItems, error: alleItemsError } = await admin
    .from("factuuritems")
    .select("id, dossiernummer, klant_id, honorarium, externe_kosten, korting, kantoorkosten_van_toepassing, status, facturatiebatch_id");
  if (alleItemsError) throw alleItemsError;

  const dossiernummerNaarBatchsleutel = new Map(factuuritems.filter((i) => i._batch).map((i) => [i.dossiernummer, i._batch]));
  const batchGroepen = new Map();
  for (const item of alleItems) {
    const batchSleutel = dossiernummerNaarBatchsleutel.get(item.dossiernummer);
    if (!batchSleutel || item.status !== "definitief" || item.facturatiebatch_id) continue;
    if (!batchGroepen.has(batchSleutel)) batchGroepen.set(batchSleutel, []);
    batchGroepen.get(batchSleutel).push(item);
  }

  const periodePerBatch = {
    "arcadis-2026-h1": { periode_start: "2026-01-01", periode_eind: "2026-06-30" },
    "arcadis-2025-h2": { periode_start: "2025-07-01", periode_eind: "2025-12-31" },
    "lipton-2026-q2": { periode_start: "2026-02-01", periode_eind: "2026-05-31" },
  };

  let batchesAangemaakt = 0;
  for (const [batchSleutel, items] of batchGroepen) {
    const totaalHonorarium = round2(items.reduce((som, i) => som + i.honorarium, 0));
    const totaalExterneKosten = round2(items.reduce((som, i) => som + i.externe_kosten, 0));
    const totaalKorting = round2(items.reduce((som, i) => som + i.korting, 0));
    const totaalKantoorkosten = round2(
      items.reduce((som, i) => som + (i.kantoorkosten_van_toepassing ? (i.honorarium + i.externe_kosten - i.korting) * 0.06 : 0), 0)
    );
    const totaalBedrag = round2(totaalHonorarium + totaalExterneKosten - totaalKorting + totaalKantoorkosten);

    const { data: batch, error: batchError } = await admin
      .from("facturatiebatches")
      .insert({
        klant_id: items[0].klant_id,
        ...periodePerBatch[batchSleutel],
        status: "gefactureerd",
        totaal_honorarium: totaalHonorarium,
        totaal_externe_kosten: totaalExterneKosten,
        totaal_korting: totaalKorting,
        totaal_kantoorkosten: totaalKantoorkosten,
        totaal_bedrag: totaalBedrag,
        goedgekeurd_door: teamleiderId,
        goedgekeurd_op: new Date().toISOString(),
      })
      .select()
      .single();
    if (batchError) throw batchError;

    const { error: linkError } = await admin
      .from("factuuritems")
      .update({ facturatiebatch_id: batch.id })
      .in("id", items.map((i) => i.id));
    if (linkError) throw linkError;
    batchesAangemaakt += 1;
  }
  console.log(batchesAangemaakt > 0 ? `✓ facturatiebatches: ${batchesAangemaakt} aangemaakt` : "↺ facturatiebatches bestaan al");

  console.log("\nKlaar. Inloggegevens (lokaal, wachtwoord voor alle demo-accounts):");
  console.log(`  wachtwoord: ${DEV_PASSWORD}`);
  for (const u of USERS) console.log(`  ${u.email}  (${u.role})`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
