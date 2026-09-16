// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "1.0.0",
  releasedatum: "2026-09-16",
  titel: "Bèta-lancering (v1.0): inloggen met wachtwoord, teams filteren, auditlog voor beheerder",
  nieuwe_functies: [
    "Inloggen gaat voortaan via e-mail + wachtwoord i.p.v. een magic link, met een 'Wachtwoord vergeten?'-link op het inlogscherm die je zelf een nieuw wachtwoord laat instellen",
    "Factuuritems-overzicht: filteren per team via tabs, zodra je in meerdere teams zit",
    "Nieuw factuuritem: dossiernaam (merk) per dossier zelf invullen, en een klant zoeken op naam óf op PNN (Patricia ID)",
    "Specificatie: alle dossiernummers van die specificatie in één keer kopiëren (gescheiden door '; '), handig om ze in Patricia bij de juiste dossiers te zetten",
    "Klanten > klantpagina: alle specificaties van die klant staan bij elkaar, met de datum waarop ze zijn vastgelegd",
    "Projecten zijn na aanmaken ook wijzigbaar (naam, PO-nummer, omschrijving) en archiveerbaar",
    "Factuuritem crediteren met een negatief bedrag, voor deelcredits",
    "Instellingen > Auditlog (nieuw, alleen zichtbaar voor beheerder): wie heeft wat aangemaakt of gewijzigd op klanten, factuuritems, specificaties en tarieven — 60 dagen bewaard, met de actuele opslaggrootte erbij",
  ],
  wijzigingen: [
    "Rol 'Teamleider' heet overal 'Praktijkvoerder' (alleen de naam, niet de rechten)",
    "Factuuritems groeperen op dossier (schakelaar naast groeperen op project) en zoeken op dossiernaam",
    "Land-tags en medewerker-badges hebben nu allemaal hun eigen, consistente kleur",
    "Standaard uurtarief (zonder specifieke klant- of medewerkerafspraak) van €250 naar €330",
  ],
  bugfixes: [
    "Een factuuritem aanmaken voor een teamgenoot gaf soms de onterechte foutmelding 'al definitief/gefactureerd'",
    "Je kon soms factuuritems zien van een teamgenoot die voor een ánder team van die teamgenoot waren aangemaakt, waar je zelf geen lid van bent",
    "Medewerker-badges kregen bij meer dan 5 actieve medewerkers soms dezelfde kleur",
    "Een teamleider kon een nog niet gefactureerd factuuritem van een teamgenoot niet verwijderen",
  ],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "Dossiernaam (merk) vul je nog zelf in — de automatische koppeling met Patricia is in ontwikkeling, nog niet live",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import/zoeken haalt alleen naam, adres en PNN op — overige klantgegevens vul je zelf aan, en Chronos maakt zelf geen nieuwe klanten meer aan (alleen ophalen uit HubSpot)",
    "'Inloggen als' is eenrichtingsverkeer: terug naar je eigen account gaat via uitloggen en opnieuw inloggen",
  ],
  gebruikersactie:
    "Je logt voortaan in met e-mailadres + wachtwoord i.p.v. een magic link. Als je nog niet eerder met een wachtwoord hebt ingelogd: gebruik het tijdelijke wachtwoord dat je via een beheerder hebt gekregen, of klik op 'Wachtwoord vergeten?' op het inlogscherm om er zelf een nieuwe in te stellen.",
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
