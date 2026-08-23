// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.19.0",
  releasedatum: "2026-08-24",
  titel: "Factuuritems per klant verfijnd, bureaukosten op de specificatie, landnamen compleet",
  nieuwe_functies: [
    "Bij de factuuritems van een klant staat nu een knop 'Nieuw factuuritem' om er direct voor die klant een aan te maken",
    "Een teamleider (of beheerder) kan bij het bewerken van een factuuritem nu ook de medewerker wijzigen die het heeft aangemaakt",
  ],
  wijzigingen: [
    "Na het opslaan of sluiten van een factuuritem kom je weer terug op de factuuritems van die klant, niet meer op de klantenlijst",
    "Alle 248 ISO-landcodes leveren nu de juiste landnaam op in het dossiernummer-veld (bijv. OM → Oman) — voorheen kende de live-preview er maar 65",
    "Geen avatar meer per klant in het factuuritems-overzicht",
    "De specificatie toont nu ook de bureaukosten in het totalenblok, naast honorarium, korting en de eindsom",
    "Nieuwe specificatie: periode start/eind zijn vervangen door de klantgegevens en het projectnummer; 'extra korting' is een numeriek veld met een €-teken; de titel is 'Specificatie factuur' (was 'Specificatie maandfactuur'); de tabel past nu zonder scrollbalk, ook met alle kolommen aan",
    "Dashboard: de omzet-per-maand-tabel kleurt rood/groen op teken t.o.v. het target, en de teamkaarten tonen icoon-tegels net als de rest van het dashboard",
  ],
  bugfixes: [],
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
