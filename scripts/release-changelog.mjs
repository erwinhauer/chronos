// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.12.0",
  releasedatum: "2026-08-20",
  titel: "Factuuritems per klant, vrij dossiers intypen, landenlijst en UI-verbeteringen",
  nieuwe_functies: [
    "Factuuritems-overzicht toont nu eerst een ingeklapte lijst per klant (naam + openstaand bedrag) met een zoekveld; een klik opent de volledige, vertrouwde tabel voor die klant",
    "Bij een factuuritem kun je een dossiernummer nu ook direct intypen (in plaats van alleen aanklikken in de suggestielijst), en met komma's of puntkomma's meteen meerdere dossiers achter elkaar toevoegen of plakken",
    "Instellingen → Landen (beheerder): volledige, bewerkbare landenlijst (NL/EN, ISO-code) — de landnamen op de specificatie en interne overzichten volgen deze lijst",
    "Klantscherm: schakelaar 'Facturen per e-mail versturen' — uitzetten als de klant met een eigen billing-systeem werkt; er wordt dan alleen nog een PDF aangemaakt, niet verstuurd",
    "Teams kunnen nu een team-e-mailadres krijgen bij Instellingen, dat automatisch in cc gaat bij het versturen van facturen van klanten die dat team bedient",
  ],
  wijzigingen: [
    "Factuuritems-tabel: dossier-subtekst toont nu de merknaam in plaats van dienst/land, medewerker wordt getoond als initialen-tag, er is een nieuwe kolom 'Land', lange omschrijvingen breken nu netjes af, en 'Bewerken' is een icoon geworden",
    "Factuuritem-formulier: dossiers en klantgegevens (incl. adres) staan naast elkaar, net als omschrijving en interne opmerking; bedragvelden tonen een €-teken en 'Aantal' toont altijd 1 decimaal",
    "Alle invoervelden en knoppen hebben iets meer padding gekregen; modals hebben nu ruime padding rondom (2rem) in plaats van krap",
    "De zijbalk (Profiel/Instellingen) blijft nu altijd in beeld, ook als de hoofdpagina lang is",
  ],
  bugfixes: [
    "Landcode 'SV' werd onterecht als Sri Lanka getoond (moet El Salvador zijn, conform ISO 3166-1) — de volledige landenlijst is nagelopen en gecorrigeerd",
    "Een factuuritem bewerken waarvan een dossier inmiddels inactief was gaf onterecht de foutmelding 'Voeg minimaal één dossier toe' bij opslaan, ook zonder wijzigingen — dossiers worden nu op dossiernummer herleid in plaats van op een lijst die alleen actieve dossiers bevat",
  ],
  bekende_beperkingen: [
    "Het daadwerkelijk versturen van de e-mail vraagt een Resend API-key en een geverifieerd verzenddomein — zonder die configuratie wordt de PDF wel gemaakt en opgeslagen, maar niet verstuurd",
    "Een kopie van de factuur in het Patricia-dossier hangen kan pas zodra de echte Patricia-koppeling er is (staat op de backlog)",
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
