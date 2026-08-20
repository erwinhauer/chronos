// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.8.0",
  releasedatum: "2026-08-20",
  titel: "Dashboard: bruto/nettotargets, omzet-periodefilter en rol 'Directie'",
  nieuwe_functies: [
    "Elk team heeft nu een apart bruto- en nettotarget (was één jaardoel); nettotarget instelbaar naast het bestaande brutotarget in Instellingen → Teams",
    "Bruto-omzet en uren-omzet per team en per teamlid, filterbaar op maand, kwartaal of halfjaar naast de standaard YTD-weergave",
    "Nieuwe tabel 'Nog te factureren per klant' op het dashboard",
    "Nieuwe rol 'Directie': read-only toegang tot de financiële dashboardinformatie van alle teams, geen navigatie naar Factuuritems/Klanten/Instellingen",
  ],
  wijzigingen: [
    "De 'omzet per teamlid'-grafiek is niet langer firm-wide maar per team gescoped, zoals de rest van het dashboard al was",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Nettotarget toont alleen het ingestelde bedrag; de bijbehorende werkelijke netto-omzet en 'on target'-vergelijking volgen in een latere ronde",
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
