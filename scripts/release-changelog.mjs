// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.25.0",
  releasedatum: "2026-08-26",
  titel: "Dashboard herbouwd met onderhanden werk, uren/stuks en topklanten",
  nieuwe_functies: [
    "Dashboard: nieuwe sectie 'Onderhanden werk' met een tegel per team plus een groepstotaal (beheerder/directie/finance), of de eigen team-/persoonlijke tegel (teamleider/medewerker)",
    "Dashboard: 'Omzet per medewerker' toont nu ook de uren/stuks-uitsplitsing (declarabel uurwerk vs. fixed fee), zowel bedrijfsbreed als per team",
    "Dashboard: nieuwe 'Omzet per klant (top 20)' met een uitklapbare uitsplitsing per klant naar productgroep en land/regio",
    "Dashboard: 'Omzet per land/regio' toont nu de top 20 in plaats van de top 5",
    "Nieuwe specificatie: een concept-PDF is nu te downloaden vóór het definitief maken, met een duidelijk 'CONCEPT'-watermerk zodat hij niet per ongeluk als definitieve specificatie wordt verstuurd",
    "Instellingen > Gebruikers: een beheerder kan nu ook het e-mailadres van een gebruiker wijzigen (dit is tevens het inlog-e-mailadres) en een gebruiker verwijderen (zet 'm op inactief — historie en auditlog blijven intact)",
  ],
  wijzigingen: [
    "Dashboard: 'Verkochte diensten' heet nu 'Omzet per productgroep' en is geordend op de acht productgroepcodes (TM/D/I/O/CA/S/W/@) in plaats van op omzet",
    "Instellingen: de HubSpot-tab is verwijderd — klanten zoeken/importeren gaat al via het klant-zoekveld bij Nieuw factuuritem",
  ],
  bugfixes: [
    "Nieuw factuuritem: het HubSpot-klantzoekveld vond een bedrijf niet zolang je het laatste woord nog aan het typen was (bv. 'bouwmach' voordat 'bouwmachines' was afgetypt) — een zoekterm moest daar een volledig woord zijn; dit matcht nu ook op het begin van een nog niet afgetypt woord",
    "Nieuw factuuritem: een mislukte HubSpot-zoekopdracht (bv. een verlopen token) toonde stilzwijgend 'geen klanten gevonden' in plaats van de eigenlijke foutmelding",
  ],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam, adres en PNN op — overige klantgegevens vul je zelf aan, er is geen scherm meer om die te bewerken",
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
