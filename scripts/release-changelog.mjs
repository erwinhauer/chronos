// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.9.0",
  releasedatum: "2026-08-20",
  titel: "Meerdere rollen per gebruiker, profielpagina en profielfoto",
  nieuwe_functies: [
    "Een gebruiker kan nu meerdere rollen toegekend krijgen (door een beheerder) en zelf wisselen tussen zijn toegekende rollen via de sidebar — dit wisselt direct de daadwerkelijke rechten, niet alleen de weergave",
    "Nieuwe pagina 'Profiel' (voor elke rol): toont naam, team(s) en toegekende rollen, en laat de gebruiker zelf een profielfoto uploaden",
    "Voornaam en achternaam zijn nu apart instelbaar bij het aanmaken/bewerken van een gebruiker (was één vrij-tekstveld 'Naam')",
  ],
  wijzigingen: [
    "Instellingen → Gebruikers: het rolveld is een aanvinklijst geworden (meerdere rollen per gebruiker) in plaats van een keuzelijst met precies één rol",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Naam, team en rol zijn op de Profiel-pagina alleen-lezen — wijzigen kan alleen door een beheerder via Instellingen",
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
