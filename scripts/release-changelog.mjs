// Zet een changelog-entry in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy van dezelfde commit (zelfde versienummer) dupliceert niets.
import { createClient } from "@supabase/supabase-js";

// Vóór elke commit bijwerken met de wijzigingen van die release.
const CHANGELOG_ENTRY = {
  versienummer: "0.26.0",
  releasedatum: "2026-08-26",
  titel: "Magic-link inloggen, teamkeuze bij factuuritems, dashboard-KPI's voor teamleider/medewerker",
  nieuwe_functies: [
    "Inloggen gaat voortaan via een magic link naar je e-mailadres (5 minuten geldig) — wachtwoorden zijn overal verdwenen",
    "Nieuwe klant: valuta (EUR/USD) instelbaar bij aanmaken, en wisselbaar vanaf het factuuritem-scherm — net als de taal",
    "Dossiernummer: nieuwe landcode 'MI' (Multisearch), voor gebruik bij Onderzoeken",
    "Instellingen > Gebruikers: Actief/Inactief-tabblad; een niet-actieve gebruiker zonder enige overgebleven historie wordt automatisch definitief verwijderd",
    "Nieuw factuuritem: een medewerker in meerdere teams kiest nu expliciet voor welk team het item is (verschijnt alleen als je in meer dan 1 team zit)",
    "Dashboard (teamleider/medewerker): per team een nieuwe indeling — gefactureerd (YTD), nog te factureren werk van het team, omzet deze maand (MTD) en een donutchart t.o.v. het maandtarget, plus vierkante KPI-tegels per teamlid (uren/niet-uren, MTD en YTD, teamleider eerst)",
    "Dashboard: 'Omzet per klant', 'per productgroep' en 'per land/regio' zijn nu elk onafhankelijk filterbaar (YTD/MTD/maand/kwartaal)",
  ],
  wijzigingen: [
    "Instellingen > Gebruikers: 'Verwijderen' heet nu 'Deactiveren' (deed altijd al hetzelfde — op inactief zetten, nooit een echte verwijdering)",
    "Nieuwe gebruiker aanmaken: geen tijdelijk wachtwoord meer — een net aangemaakte gebruiker logt direct in via magic link",
  ],
  bugfixes: [],
  bekende_beperkingen: [
    "Netto-omzet is nog een tijdelijke placeholder (67% van de bruto-omzet) — de echte netto-omzet per regel kan nog niet uit Chronos worden afgeleid, dat rekent Finance vooralsnog zelf maandelijks uit",
    "Matter (dossieromschrijving) staat nog niet op nieuwe factuuritems — dat komt pas mee zodra de echte Patricia-koppeling er is; op de specificatie staat dan tijdelijk een '—'",
    "Matter type wordt nog steeds afgeleid uit het dossiernummer; in de praktijk kan hetzelfde dossier bij verschillende werkzaamheden een andere matter type hebben — dat is nog niet per factuurregel instelbaar",
    "HubSpot-import haalt alleen naam, adres en PNN op — overige klantgegevens vul je zelf aan, er is geen scherm meer om die te bewerken",
    "'Inloggen als' is eenrichtingsverkeer: terug naar je eigen account gaat via uitloggen en opnieuw inloggen, er is geen 'terug naar beheerder'-snelkoppeling",
    "Teamkeuze bij een factuuritem geldt alleen voor nieuwe items; bestaande items kregen bij deze release alleen automatisch een team als de medewerker op dat moment in precies 1 team zat",
  ],
  gebruikersactie:
    "Je logt vanaf nu in met een magic link i.p.v. een wachtwoord: vul je e-mailadres in en klik op de link die je per e-mail ontvangt (5 minuten geldig).",
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
