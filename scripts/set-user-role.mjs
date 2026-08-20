// Eenmalig hulpscript: zet direct de rol van een bestaande gebruiker.
//
// Uitvoering: door de gebruiker zelf, lokaal, met env vars (nooit door mij gezet):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (van het project waar het account op staat)
//   TARGET_EMAIL                              (het e-mailadres van het account)
//   NEW_ROLE                                  (medewerker | teamleider | finance | beheerder | directie)
// Voorbeeld:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TARGET_EMAIL=erwin@knijff.com \
//   NEW_ROLE=beheerder node scripts/set-user-role.mjs

import { createClient } from "@supabase/supabase-js";

const GELDIGE_ROLLEN = ["medewerker", "teamleider", "finance", "beheerder", "directie"];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const NEW_ROLE = process.env.NEW_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TARGET_EMAIL || !NEW_ROLE) {
  console.error("Ontbrekende env vars. Vereist: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_EMAIL, NEW_ROLE.");
  process.exit(1);
}

if (!GELDIGE_ROLLEN.includes(NEW_ROLE)) {
  console.error(`Ongeldige rol "${NEW_ROLE}". Geldige waarden: ${GELDIGE_ROLLEN.join(", ")}.`);
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`Ophalen van gebruikers mislukt: ${listError.message}`);

  const user = data.users.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`Geen account gevonden met e-mailadres ${TARGET_EMAIL}.`);

  const { error: updateError } = await admin.from("profiles").update({ role: NEW_ROLE }).eq("id", user.id);
  if (updateError) throw new Error(`Rol bijwerken mislukt: ${updateError.message}`);

  // Sinds meerdere rollen per gebruiker mogelijk zijn, moet de actieve rol ook
  // in profile_roles staan — anders wijst switch_active_role() deze rol af.
  const { error: roleRowError } = await admin
    .from("profile_roles")
    .upsert({ profile_id: user.id, role: NEW_ROLE }, { onConflict: "profile_id,role" });
  if (roleRowError) throw new Error(`Toekennen van de rol mislukt: ${roleRowError.message}`);

  console.log(`✓ Rol van ${TARGET_EMAIL} is bijgewerkt naar "${NEW_ROLE}".`);
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
