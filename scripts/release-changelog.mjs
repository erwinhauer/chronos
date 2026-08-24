// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.20.0",
  releasedatum: "2026-08-24",
  titel: "Vlaggen en icoontjes op het dashboard, opmaak- en bestandsnaam-fixes op de specificatie",
  nieuwe_functies: [],
  wijzigingen: [
    "Dashboard: 'Diensten per land/regio' toont nu de landsvlag in plaats van een avatar, en 'Verkochte diensten' een bij de dienst passend icoon in een cirkel",
    "De gedownloade specificatie-PDF krijgt nu een herkenbare bestandsnaam: 'JJJJMMDD Klantnaam Specificatie factuur.pdf' (of 'Specification Invoice' in het Engels)",
    "Factuuritem aanmaken/bewerken: 'Honorarium en kosten' is nu duidelijker onderverdeeld in Kosten Knijff (met Aantal (Qty), dat hiernaartoe verhuisd is), Kosten van derden, Korting en Kantoorkosten",
    "Het veld 'Declarabel' staat bij een nieuw factuuritem niet meer standaard aangevinkt",
  ],
  bugfixes: [
    "De bevestigingsdialoog bij 'Specificatie maken' liep met zijn knoppen buiten de dialoog — die knoppen staan nu netjes gestapeld binnen de dialoog",
  ],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "'Diensten per land/regio' is afgeleid van de landcode in het dossiernummer; factuuritems zonder (herkenbare) landcode in het dossiernummer tellen niet mee in die tegel",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam en adres op (Companies hebben geen contactpersoon-veld) — contactpersoon en e-mailadres vul je na import zelf in bij Klant bewerken",
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
