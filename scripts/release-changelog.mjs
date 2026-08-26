// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.23.0",
  releasedatum: "2026-08-26",
  titel: "Inloggen als (testfase), fuzzy klantzoeken, Teams in tabs, wijzigingslog op factuuritems",
  nieuwe_functies: [
    "Instellingen > Gebruikers: een beheerder kan nu 'Inloggen als' een andere gebruiker gebruiken om tijdens de testfase testdata aan te maken en te zien hoe verschillende rollen Chronos ervaren — dit wordt altijd gelogd in de auditlog en toont een banner tot je uitlogt",
    "Factuuritems bewerken: een uitklapbare 'Log'-sectie onder Honorarium en kosten houdt per wijziging bij wie wat heeft aangepast (klant, medewerker, project, bedragen, etc.); logregels ouder dan 6 maanden worden automatisch opgeruimd",
    "Dashboard (beheerder/directie): een nieuwe kaart 'Omzet buiten een team' toont omzet van medewerkers die (nog) geen lid zijn van een team, zodat die niet langer onzichtbaar wegvalt uit de teamkaarten",
  ],
  wijzigingen: [
    "Nieuw factuuritem / bewerken: het klant-zoekveld matcht nu ook op een niet-exacte (fuzzy) naam, inclusief typefouten en afwijkende diakritische tekens",
    "Dashboard (beheerder/directie): de Teams-sectie staat nu achter horizontale tabs in plaats van naast elkaar, voor een rustiger overzicht bij veel teams",
    "Landcode 'WW' (wereldwijd) toont nu overal 'Wereldwijd' in plaats van de kale code, met dezelfde vlagloze weergave als 'WO'",
    "De 'Klanten'-sectie (menu-item, overzicht en detailpagina) is verwijderd nu klanten via HubSpot doorzocht en aangemaakt worden vanuit Nieuw factuuritem — klantgegevens bewerken, projecten bewerken/deactiveren en het financiële klantoverzicht zijn daarmee voorlopig nergens meer te doen",
  ],
  bugfixes: [
    "Dashboard: omzet van een medewerker die (nog) geen lid is van een team viel stil weg uit alle teamkaarten, ook als de bijbehorende factuuritems wel degelijk op naam stonden — zie 'Omzet buiten een team' hierboven",
  ],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "'Diensten per land/regio' is afgeleid van de landcode in het dossiernummer; factuuritems zonder (herkenbare) landcode in het dossiernummer tellen niet mee in die tegel",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam en adres op; er is nu geen scherm meer om overige klantgegevens (adres, kantoorkosten, btw-instellingen, opmerkingen) aan te vullen of te wijzigen, en ook niet om een bestaand project te bewerken of te deactiveren",
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
