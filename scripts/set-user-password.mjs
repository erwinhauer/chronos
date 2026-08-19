// Eenmalig hulpscript: zet direct een nieuw wachtwoord voor een bestaande gebruiker,
// zonder afhankelijk te zijn van een e-mail/reset-link (Chronos heeft nog geen
// wachtwoord-vergeten-pagina, dus een Supabase-recovery-link heeft nergens om te landen).
//
// Uitvoering: door de gebruiker zelf, lokaal, met env vars (nooit door mij gezet):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (van het project waar het account op staat)
//   TARGET_EMAIL                              (het e-mailadres van het account)
//   NEW_PASSWORD                              (het gewenste nieuwe wachtwoord)
// Voorbeeld:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TARGET_EMAIL=erwin@knijff.com \
//   NEW_PASSWORD=... node scripts/set-user-password.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const NEW_PASSWORD = process.env.NEW_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TARGET_EMAIL || !NEW_PASSWORD) {
  console.error("Ontbrekende env vars. Vereist: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_EMAIL, NEW_PASSWORD.");
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

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: NEW_PASSWORD });
  if (updateError) throw new Error(`Wachtwoord instellen mislukt: ${updateError.message}`);

  console.log(`✓ Wachtwoord voor ${TARGET_EMAIL} is bijgewerkt.`);
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
