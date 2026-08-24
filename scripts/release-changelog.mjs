// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.21.0",
  releasedatum: "2026-08-24",
  titel: "Benelux-vlag, HubSpot-import vanuit Klanten, projectomschrijving en formulierfixes",
  nieuwe_functies: [
    "Klanten: vanaf de Klanten-pagina kan een nieuwe klant nu ook rechtstreeks uit HubSpot geïmporteerd worden (voorheen alleen via Instellingen)",
    "Projecten kunnen nu ook een vrije omschrijving krijgen, naast de projectnaam en het PO-nummer — zichtbaar bij de factuuritems van die klant",
  ],
  wijzigingen: [
    "Dashboard: regio 'Benelux' toont nu de Benelux-vlag in plaats van een generiek wereldbol-icoon (voor 'Wereldwijd'/internationale registraties blijft dat icoon staan — daarvoor bestaat geen vlag)",
    "De contactpersoon-koppeling op een klant (naam + e-mailadres) is verwijderd — die werd nergens gebruikt en stond alleen maar in de weg bij het aanmaken van een klant",
    "Nieuw factuuritem: de velden 'Kosten van derden' en 'Korting' lijnen nu verticaal netjes uit",
    "Nieuw factuuritem: de placeholder bij 'Dossier(s)' legt nu uit hoe je een dossiernummer toevoegt, in plaats van een voorbeeldformaat te tonen",
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
