// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.11.0",
  releasedatum: "2026-08-20",
  titel: "Voorbeeldfactuur, factuurkorting, verzending per e-mail en uitgebreide managementcijfers",
  nieuwe_functies: [
    "Nieuw scherm bij het factureren: een echte voorbeeldfactuur met specificatie, periode, extra korting op de hele factuur en het e-mailadres (+ cc) van de debiteur, met een bevestiging vóór de factuur definitief wordt",
    "Na bevestigen wordt automatisch een PDF gemaakt en per e-mail verstuurd naar de debiteur, met een kopie aan de medewerkers op de factuur; bij een mislukte verzending verschijnt een duidelijke melding met een 'opnieuw versturen'-knop op de specificatiepagina",
    "Korting op de hele factuur (los van de bestaande korting per factuuritem)",
    "Klantscherm: schakelaar om kosten van derden apart te tonen op de specificatie",
    "Factuuritem-scherm: de taal van de klant is nu zichtbaar en direct wijzigbaar",
    "Teamleiders kunnen nu projecten/PO-nummers beheren voor klanten die hun team al bedient (voorheen alleen beheerder)",
    "Dashboard: nieuwe periode 'Heel jaar' en een jaarkeuze, omzet per medewerker over alle teams heen, top 3 klanten per team, en een overzicht van omzet/uren per dienst (merken, modellen, opposities, enz.)",
  ],
  wijzigingen: [
    "Dossiernummer-lettercodes: 'CA' heet nu 'Cancellations' (was 'Cancellation Actions'); 'A' (overeenkomsten) en '@' (domeinnamen) toegevoegd",
    "Dashboard: 'Nog te factureren' en 'Gefactureerd' volgen nu dezelfde periode-/jaarfilter als de rest van het dashboard, in plaats van altijd het volledige verleden te tonen",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Het daadwerkelijk versturen van de e-mail vraagt een Resend API-key en een geverifieerd verzenddomein — zonder die configuratie wordt de PDF wel gemaakt en opgeslagen, maar niet verstuurd",
    "Een kopie van de factuur in het Patricia-dossier hangen kan pas zodra de echte Patricia-koppeling er is (staat op de backlog)",
  ],
  gebruikersactie:
    "Voor daadwerkelijke e-mailverzending: RESEND_API_KEY instellen in de omgevingsvariabelen (en optioneel FACTUUR_AFZENDER voor het afzenderadres).",
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
