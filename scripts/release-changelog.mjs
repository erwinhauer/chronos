// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.24.0",
  releasedatum: "2026-08-26",
  titel: "PNN uit HubSpot, dossiertype Onderzoeken, specificatie-opmaak met Knijff-logo",
  nieuwe_functies: [
    "Nieuw/bewerk factuuritem: het HubSpot-klantzoekveld toont nu ook het PNN (Patricia Name Number) per bedrijf, en het opgehaalde PNN wordt bij import in Chronos opgeslagen",
    "Factuuritems > klant en de factuuritems-lijst tonen het PNN nu direct bij de klantnaam (als tag in de lijst, als regel onder de naam op de klantpagina, samen met het adres)",
    "Nieuw/bewerk factuuritem: een beheerder kan een verouderde of foutief aangemaakte klant nu rechtstreeks uit het klant-zoekveld verwijderen (zachte verwijdering — bestaande factuuritems/projecten blijven intact)",
    "Dossiernummerformat: 'S' is toegevoegd als prefix voor 'Onderzoeken'",
  ],
  wijzigingen: [
    "Dashboard: de jaar-kiezer gaat nu 5 kalenderjaren terug in plaats van 4, zodat meerjarige analyses (bv. per land/product) mogelijk blijven",
    "Specificatie: de beige kopbalk is vervangen door het officiële Knijff-logo, de maandnaam begint nu met een hoofdletter, en de aanmaakdatum van de specificatie staat er nu bij",
    "Specificatie: 'Knijff ref.' en 'Matter' staan nu samen in één kolom (onder elkaar) en de losse 'Matter type'-kolom is verwijderd",
  ],
  bugfixes: [
    "Nieuw factuuritem: de bevestigingsdialoog bij 'Sluiten zonder opslaan' liep aan de rechterkant over de rand van het venster heen",
  ],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "'Diensten per land/regio' is afgeleid van de landcode in het dossiernummer; factuuritems zonder (herkenbare) landcode in het dossiernummer tellen niet mee in die tegel",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam, adres en PNN op — overige klantgegevens vul je zelf aan, er is nu geen scherm meer om die te bewerken",
    "'Inloggen als' is eenrichtingsverkeer: terug naar je eigen account gaat via uitloggen en opnieuw inloggen, er is geen 'terug naar beheerder'-snelkoppeling",
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
