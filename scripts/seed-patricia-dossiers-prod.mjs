// Eenmalig script: vult de (tijdelijke dummy-)patricia_dossiers-tabel op een
// live Supabase-project, gekoppeld aan de bestaande klanten "Arcadis" en
// "Lipton Teas & Infusions" op naam. Nodig omdat scripts/seed.mjs alleen voor
// lokale ontwikkeling is (maakt ook demo-gebruikers aan) en dus nooit tegen
// productie gedraaid mag worden — dit script raakt alleen patricia_dossiers aan.
//
// Uitvoering: door de gebruiker zelf, lokaal, met env vars (nooit door mij gezet):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (van het project waar geseed wordt)
// Voorbeeld:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-patricia-dossiers-prod.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Ontbrekende env vars. Vereist: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Zelfde lijst als scripts/seed.mjs, zodat lokale demo en productie hetzelfde
// beeld geven.
function buildDossiers(arcadisId, liptonId) {
  return [
    { klant_id: arcadisId, dossiernummer: "TM93905GB00", matter_naam: "GENX-merkfamilie (VK)" },
    { klant_id: arcadisId, dossiernummer: "O26921PL00", matter_naam: "Oppositie ARCADIS ./. ARKADIS (PL)" },
    { klant_id: arcadisId, dossiernummer: "O26922PL00", matter_naam: "Oppositie ARCADIS ./. ARKADIS (PL) — dossier 2" },
    { klant_id: arcadisId, dossiernummer: "TM94010NL00", matter_naam: "GENX-familie NL — registratie 1" },
    { klant_id: arcadisId, dossiernummer: "TM94011NL00", matter_naam: "GENX-familie NL — registratie 2" },
    { klant_id: arcadisId, dossiernummer: "TM94012NL00", matter_naam: "GENX-familie NL — registratie 3" },
    { klant_id: arcadisId, dossiernummer: "O27050DE00", matter_naam: "Oppositie voorbereiding Duitsland" },
    { klant_id: arcadisId, dossiernummer: "TM94500FR00", matter_naam: "Merkonderzoek Frankrijk" },
    { klant_id: liptonId, dossiernummer: "TM93669BD30", matter_naam: "LIPTON YELLOW LABEL TEA (Bangladesh)" },
    { klant_id: liptonId, dossiernummer: "TM102373US00", matter_naam: "ZEN-merkregistratie (VS)" },
    { klant_id: liptonId, dossiernummer: "O103109EU00", matter_naam: "Oppositie ELEPHANT ./. ELEPHANT BAY (EU)" },
    { klant_id: liptonId, dossiernummer: "TM95012JP00", matter_naam: "Merkregistratie Japan" },
    { klant_id: liptonId, dossiernummer: "TM95500CA00", matter_naam: "Merkregistratie Canada" },
    { klant_id: liptonId, dossiernummer: "TM96010GB00", matter_naam: "PURE GREEN-merkaanvraag (VK)" },
    { klant_id: liptonId, dossiernummer: "O26950NL00", matter_naam: "Oppositie SIR-thee (NL)" },
    { klant_id: liptonId, dossiernummer: "CA12000EU00", matter_naam: "Cancellation action — LEMON BREEZE (EU)" },
  ];
}

async function main() {
  const { data: klanten, error: klantenError } = await admin
    .from("klanten")
    .select("id, naam")
    .in("naam", ["Arcadis", "Lipton Teas & Infusions"]);
  if (klantenError) throw klantenError;

  const arcadis = klanten.find((k) => k.naam === "Arcadis");
  const lipton = klanten.find((k) => k.naam === "Lipton Teas & Infusions");
  if (!arcadis || !lipton) {
    throw new Error(
      `Kon niet beide klanten vinden (Arcadis: ${!!arcadis}, Lipton Teas & Infusions: ${!!lipton}). Niets aangepast.`
    );
  }

  const dossiers = buildDossiers(arcadis.id, lipton.id);
  const { error } = await admin.from("patricia_dossiers").upsert(dossiers, { onConflict: "klant_id,dossiernummer" });
  if (error) throw error;

  console.log(`✓ patricia_dossiers: ${dossiers.length} rijen gezet (Arcadis: 8, Lipton: 8).`);
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
