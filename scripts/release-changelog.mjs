// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.4.0",
  releasedatum: "2026-07-23",
  titel: "Metrics-scope, schaalbare Instellingen, factuuritems-polish en deploy-automatisering",
  nieuwe_functies: [
    "Instellingen: zoekbare en sorteerbare tabellen voor Gebruikers en Teams (bewerken via dialoog)",
    "Factuuritems: projectloze items kunnen via regelselectie alsnog naar een project verplaatst worden",
    "Schema-migraties en changelog-entries worden voortaan automatisch toegepast bij elke productie-deploy",
  ],
  wijzigingen: [
    "Teamdoelen op het dashboard tonen voortaan alleen het eigen team (finance/beheerder blijven alles zien)",
    "Factuuritems toont alleen nog te factureren regels (geen filter-tabs meer nodig)",
    "Factuuritems-kolommen lijnen consistent uit tussen klanten en projecten",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
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
