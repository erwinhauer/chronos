// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.7.0",
  releasedatum: "2026-08-20",
  titel: "Nieuw factuuritem: dossierlookup, prijstype en kortingpercentage",
  nieuwe_functies: [
    "Dossier(s) kiezen via een zoekbare lijst (tijdelijke dummy-databank ter voorbereiding op de Patricia-koppeling) i.p.v. vrije tekst — de klant en een startomschrijving worden hieruit automatisch afgeleid",
    "Prijstype (Uren / Fixed fee) is nu een verplichte keuze zonder standaardwaarde",
    "Korting kan nu ook als percentage van het honorarium ingevoerd worden, naast een vast bedrag",
    "Interne opmerking is visueel duidelijk anders gestyled ('Niet zichtbaar voor klant'-label), zodat nooit per ongeluk gedacht wordt dat de klant dit ziet",
  ],
  wijzigingen: [
    "Kantoorkosten bij het factureren worden nu berekend met het percentage van de klant zelf (was altijd hardcoded 6%), met een minimum van €15 en maximum van €200 per factuur",
    "Korting mag nooit meer zijn dan het honorarium (voorheen: honorarium + externe kosten)",
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
