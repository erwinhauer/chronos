// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.22.0",
  releasedatum: "2026-08-25",
  titel: "HubSpot-import bij Nieuw factuuritem, projecten aanmaken vanuit factuuritems, teamgescoopte medewerkerlijst",
  nieuwe_functies: [
    "Nieuw factuuritem: bij het kiezen van de klant kan nu ook rechtstreeks uit HubSpot geïmporteerd worden, naast een bestaande klant kiezen of een nieuwe handmatig aanmaken",
    "Nieuw factuuritem: een nieuw project (naam + PO-nummer + omschrijving) kan nu ook direct hier aangemaakt worden, en is daarna bij alle factuuritems van die klant te selecteren",
    "Factuuritems > klant: een zoekveld filtert de lijst op dossiernummer of omschrijving",
  ],
  wijzigingen: [
    "Nieuw factuuritem: 'Eenheid' is vervangen door 'Taal' (Nederlands/Engels) — die stond al verderop in het formulier en is nu direct bij Datum te vinden",
    "Het veld 'Declarabel' staat bij een nieuw factuuritem weer standaard aangevinkt",
    "Bij het wijzigen van de medewerker op een factuuritem kan een teamleider alleen nog uit de eigen teamgenoten kiezen (was: alle actieve medewerkers); een beheerder kan nog steeds uit iedereen kiezen",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "'Diensten per land/regio' is afgeleid van de landcode in het dossiernummer; factuuritems zonder (herkenbare) landcode in het dossiernummer tellen niet mee in die tegel",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam en adres op — overige klantgegevens vul je na import zelf aan bij Klant bewerken",
  ],
  gebruikersactie: null,
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
