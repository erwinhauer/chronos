// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.13.0",
  releasedatum: "2026-08-21",
  titel: "Factuur en specificatie in Knijff-opmaak, BTW en klantadres/debiteurnummer",
  nieuwe_functies: [
    "Bij het factureren worden nu twee losse PDF's gemaakt: een korte factuur (adres, factuur-/debiteurnummer, referentieregel, Sub Totaal/BTW/Totaal, IBAN en betaaltermijn) en een landscape specificatie met de itemized regels — beide ook los te downloaden op de factuurpagina",
    "BTW: percentage en een vrij invoerbare wettelijke vermelding zijn nu instelbaar per klant (tijdelijk handmatig, bedoeld als plek totdat dit uit de Patricia-koppeling komt); wordt vastgelegd bij het factureren zodat een latere wijziging een al verstuurde factuur niet met terugwerkende kracht aanpast",
    "Factuurnummer: Chronos genereert nu automatisch een oplopend nummer bij het aanmaken van een factuur (voorlopige reeks, wordt later vervangen na afstemming met de Controller)",
    "Klantscherm: adres en debiteurnummer zijn nu bewerkbaar (stonden al in de database maar hadden nog geen invoerveld) — nodig voor het adresblok en debiteurnummer op de factuur",
  ],
  wijzigingen: [
    "De specificatie toont nu Knijff ref., Matter en Matter type als losse kolommen (was één samengevoegde 'Dossier'-kolom), met een totaalregel direct onder de kolomkoppen in plaats van onderaan",
    "De specificatie print/exporteert nu in landscape A4",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Het daadwerkelijk versturen van de e-mail vraagt een Resend API-key en een geverifieerd verzenddomein — zonder die configuratie worden de PDF's wel gemaakt en opgeslagen, maar niet verstuurd",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "Het factuurnummer is een voorlopige, eigen Chronos-reeks — nog geen echte Accountview-koppeling",
  ],
  gebruikersactie:
    "Voor bestaande klanten: adres, debiteurnummer en BTW-percentage/vermelding invullen bij Klant bewerken, anders blijven deze velden leeg op de factuur.",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log("↺ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ontbreken — changelog-entry overgeslagen.");
  process.exit(0);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await admin
  .from("productchangelog")
  .upsert(CHANGELOG_ENTRY, { onConflict: "versienummer", ignoreDuplicates: true });

if (error) {
  console.error("Wegschrijven van de changelog-entry is mislukt:", error.message);
  process.exit(1);
}

console.log(`✓ changelog-entry v${CHANGELOG_ENTRY.versienummer} vastgelegd.`);
