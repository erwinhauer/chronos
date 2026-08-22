// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.15.1",
  releasedatum: "2026-08-22",
  titel: "Factuuritems-overzicht als sorteerbare tabel",
  nieuwe_functies: [],
  wijzigingen: [
    "Het factuuritems-overzicht (per klant) is nu een gewone tabel met kolommen Klant, Aantal factuuritems, Oudste item en Bedrag — elke kolom is sorteerbaar, en blijft doorzoekbaar op klantnaam zoals voorheen",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Het daadwerkelijk versturen van de e-mail vraagt een Resend API-key en een geverifieerd verzenddomein — zonder die configuratie worden de PDF's wel gemaakt en opgeslagen, maar niet verstuurd",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "Het factuurnummer is een voorlopige, eigen Chronos-reeks — nog geen echte Accountview-koppeling",
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
