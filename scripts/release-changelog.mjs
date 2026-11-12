// Zet de changelog-entries in productchangelog voor de zojuist gedeployde release.
// Draait automatisch als onderdeel van de Vercel-build (zie package.json "vercel-build")
// — geen handmatige "Nieuwe entry" meer nodig voor releases die via commit+deploy gaan.
// Idempotent: een her-deploy (zelfde versienummer) dupliceert niets, en een omgeving die
// meerdere releases heeft gemist (bv. LIVE na een reeks beta-releases) haalt ze in één keer in.
//
// REGEL: bij elke wijziging die naar `beta` gaat komt hier een NIEUWE entry bij in
// CHANGELOG_ENTRIES (nieuw versienummer, vandaag als releasedatum), en `package.json`
// "version" gaat mee naar hetzelfde nummer. Een bestaande entry achteraf aanpassen werkt
// niet: die staat dan al in de database en wordt overgeslagen. Semver: nieuwe functie of
// optimalisatie = minor (1.3.0), alleen bugfixes = patch (1.3.1). Controle vóór het pushen:
// `npm run check:changelog`.
import { createClient } from "@supabase/supabase-js";

const RELEASE_1_0_0 = {
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

const RELEASE_1_1_0 = {
  versienummer: "1.1.0",
  releasedatum: "2026-09-29",
  titel: "Bureaukosten, DWO, aangepaste rechten en een nieuw dashboard voor Praktijkvoerder en Gebruiker",
  nieuwe_functies: [
    "Een Gebruiker mag factuuritems van een teamgenoot bekijken, bewerken en naar een ander project verplaatsen",
    "Een Gebruiker mag een specificatie maken, mits het eigen team die klant bedient",
    "Specificatie: schakelaar 'Groeperen op dossier' naast de standaard datumvolgorde",
    "Dashboard (directie/beheerder): KPI Bureaukosten en een DWO-tegel (Days Work Outstanding: hoeveel dagen werk gemiddeld onderhanden blijft staan voordat het definitief wordt gemaakt), bedrijfsbreed en per team",
    "Dashboard Praktijkvoerder en Gebruiker: een vast deel (jaar tot nu toe) en een deel dat je per periode kunt filteren",
    "Klant-omzet telt de bureaukosten mee",
    "Het menu Klanten is nu ook beschikbaar voor een Gebruiker, beperkt tot de klanten van het eigen team",
    "Dossiertypen AP (Anti-piraterij) en ID (I-depot)",
    "Het versienummer van Chronos staat onderaan de zijbalk",
  ],
  wijzigingen: [
    "Finance heeft nu dezelfde rechten als Directie, dus alleen lezen",
    "Nieuwe factuuritems aanmaken kan alleen een Gebruiker, Praktijkvoerder of beheerder",
    "Datums bij factuuritems staan altijd als dd-mm-jjjj, ongeacht de taalinstelling van je computer",
    "Dossiernummer: ook het land moet overeenkomen met het gekozen type, en een getypt dossiernummer wordt ook toegevoegd als je het veld verlaat",
    "Landnamen op de specificatie volgen de taal van de klant; Aantal en Tarief staan weer op de gewone specificatie",
    "De bureaukosten-badge is duidelijker",
  ],
  bugfixes: [
    "Dashboardcijfers per team telden werk van een Praktijkvoerder in meerdere teams dubbel mee",
    "De KPI 'Onderhanden werk' op het dashboard was onbedoeld gefilterd op periode",
    "'Nieuw factuuritem' vanuit een klant of project vulde bij meerdere projecten alleen de klant in, en bleef leeg als de klant inmiddels inactief was",
    "DWO wordt nu berekend op de gemeten doorlooptijd in plaats van een schatting",
  ],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_2_0 = {
  versienummer: "1.2.0",
  releasedatum: "2026-11-01",
  titel: "Nieuwe huisstijl en een overzichtelijker dashboard",
  nieuwe_functies: [
    "Nieuwe look: navy en koraal, een zwevende zijbalk en een schakelaar tussen licht en donker",
    "Dashboard: grote KPI-tegels met het bedrag groot en de titel klein",
    "Dashboard: twee duidelijk gescheiden blokken, 'Lopend jaar' (staat vast) en 'Periode' (volgt je periodekeuze)",
    "Dashboard: per teamlid een kaart met totaal, uren, fixed fee, onderhanden werk en aandeel in het team, in 'Periode' en als uitklapblok per team in 'Lopend jaar'",
    "Nieuw factuuritem vanuit een klant: het team van de bestaande items van die klant wordt voorgeselecteerd",
  ],
  wijzigingen: [
    "Dashboard: één periodekeuze (deze maand, dit kwartaal, laatste 3 maanden, dit jaar of een andere periode) in plaats van zes losse keuzes, standaard 'Deze maand'",
    "Dashboard: onderhanden werk is al het nog niet gefactureerde werk, ook uit eerdere periodes, en volgt de periodekeuze dus niet",
    "Dashboard: de tabel 'Omzet per medewerker, hele groep' en de donuts zijn vervangen door de teamlidkaarten en een regel in de targetstrook",
  ],
  bugfixes: [
    "'Groeperen op dossier' werkte alleen in de preview van de specificatie en nu ook in de gedownloade PDF (concept en definitief)",
    "Na het kiezen van een periode op het dashboard sprong de pagina naar een andere plek",
  ],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_3_0 = {
  versienummer: "1.3.0",
  releasedatum: "2026-11-01",
  titel: "Kleine verbeteringen in Klanten en Instellingen, en een bijgewerkte changelog",
  nieuwe_functies: [
    "Instellingen > Gebruikers: sorteren op de kolom Teams",
    "Instellingen > Teams: naast het aantal leden staan nu ook hun namen",
    "Instellingen > Landen: een kolom met de vlag van elk land",
  ],
  wijzigingen: [
    "Klanten: de kolomkoppen Gefactureerd, Factuuritems en Specificaties staan nu rechts uitgelijnd, net als de cijfers eronder",
    "De changelog is bijgewerkt met alle releases sinds 16 september, en het versienummer onderaan de zijbalk toont voortaan de nieuwste release",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_4_0 = {
  versienummer: "1.4.0",
  releasedatum: "2026-11-01",
  titel: "Dashboard: Lopend jaar en Periode wissel je bovenaan",
  nieuwe_functies: [
    "Dashboard: bovenaan wissel je met één klik tussen Lopend jaar en Periode, zodat je niet meer hoeft te scrollen. De keuze blijft staan als je de pagina ververst of de link deelt",
  ],
  wijzigingen: [
    "Dashboard: de twee blokken staan niet meer onder elkaar maar één tegelijk in beeld; bij afdrukken komen ze allebei op papier",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_5_0 = {
  versienummer: "1.5.0",
  releasedatum: "2026-11-01",
  titel: "Nieuw factuuritem: kosten derden en korting alleen als je ze nodig hebt",
  nieuwe_functies: [
    "Nieuw factuuritem: met de schakelaar Kosten derden/korting uitsplitsen toon je de velden voor kosten van derden en korting alleen wanneer je ze nodig hebt",
  ],
  wijzigingen: [
    "Nieuw factuuritem: de velden voor kosten van derden en korting zijn standaard verborgen. Bij een bestaand item met kosten of korting staat de schakelaar automatisch aan",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_6_0 = {
  versienummer: "1.6.0",
  releasedatum: "2026-11-03",
  titel: "DWO wordt per factuuritem bijgehouden, met een trend per maand",
  nieuwe_functies: [
    "Dashboard: de DWO-grafiek in Lopend jaar toont per maand hoeveel dagen het gemiddeld duurde voordat factuuritems definitief werden (alleen directie en beheerder)",
    "Het moment waarop een factuuritem definitief wordt, wordt nu op het item zelf vastgelegd, ook voor bestaande items",
  ],
  wijzigingen: [
    "DWO is nu het gewone gemiddelde aantal dagen tussen de datum van een factuuritem en het moment dat het definitief is gemaakt. Elk item telt even zwaar; eerder woog een groter bedrag zwaarder mee",
    "De DWO-tegel toont erbij over hoeveel items het gemiddelde gaat",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_7_0 = {
  versienummer: "1.7.0",
  releasedatum: "2026-11-03",
  titel: "Uitleg bij de DWO-tegel",
  nieuwe_functies: [],
  wijzigingen: [
    "Dashboard: op de DWO-tegel staat nu een korte uitleg van wat DWO is en wat het streven is (maximaal 45 dagen tussen werk doen en factureren)",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_8_0 = {
  versienummer: "1.8.0",
  releasedatum: "2026-11-03",
  titel: "Directie en Finance kunnen geen factuuritems meer aanmaken in de interface",
  nieuwe_functies: [],
  wijzigingen: [
    "Nieuw factuuritem: voor gebruikers met de rol Directie of Finance zijn alle knoppen Nieuw factuuritem grijs en niet klikbaar, met uitleg bij het aanwijzen. Wissel naar de rol Medewerker of Praktijkvoerder om een factuuritem aan te maken",
    "Kopiëren staat niet meer in het menu van een factuuritem voor Directie en Finance, en de pagina Nieuw factuuritem stuurt hen terug naar het overzicht",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_9_0 = {
  versienummer: "1.9.0",
  releasedatum: "2026-11-04",
  titel: "Nieuw favicon: het koraalkleurige Chronos-klokje",
  nieuwe_functies: [],
  wijzigingen: [
    "Het icoontje in het browsertabblad is nu het koraalkleurige Chronos-klokje, in plaats van het klokje op een donkerblauwe cirkel",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: "Zie je nog het oude icoontje? Ververs de pagina met Cmd+Shift+R; browsers bewaren favicons soms een tijdje",
};

const RELEASE_1_10_0 = {
  versienummer: "1.10.0",
  releasedatum: "2026-11-10",
  titel: "Dossiernummers van afgesplitste dossiers worden herkend",
  nieuwe_functies: [],
  wijzigingen: [
    "Nieuw factuuritem: een dossiernummer met een letter erachter voor een afgesplitst dossier, zoals TM100479CN35A, wordt nu herkend als Merken-dossier voor China. Eerder gaf Chronos hierbij de melding Onbekend dossiernummerformaat",
  ],
  bugfixes: [],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

const RELEASE_1_10_1 = {
  versienummer: "1.10.1",
  releasedatum: "2026-11-11",
  titel: "Medewerker naar een ander team: eerdere items blijven op het oude team",
  nieuwe_functies: [],
  wijzigingen: [],
  bugfixes: [
    "Dashboard: als een medewerker naar een ander team gaat, blijft zijn eerdere werk op het oude team staan en zichtbaar op een eigen kaart met het label Voorheen in dit team. Eerder ontbrak die kaart, waardoor de kaarten niet meer optelden tot het teamtotaal",
    "Factuuritem bewerken: een praktijkvoerder of beheerder kan een nog niet gefactureerd item van een vertrokken teamlid weer bewerken zonder het team te wijzigen. Eerder gaf Chronos dan de melding Ongeldig team gekozen",
  ],
  bekende_beperkingen: [
    "Een medewerker die zelf naar een ander team is gegaan, kan zijn eigen nog niet gefactureerde items van het oude team niet meer bewerken. Een praktijkvoerder of beheerder kan dat wel",
  ],
  gebruikersactie: null,
};

const RELEASE_1_10_2 = {
  versienummer: "1.10.2",
  releasedatum: "2026-11-12",
  titel: "Beveiliging: een nieuwe gebruiker krijgt zijn rol alleen van een beheerder",
  nieuwe_functies: [],
  wijzigingen: [],
  bugfixes: [
    "Beveiliging: de rol van een nieuwe gebruiker kan niet meer door de gebruiker zelf worden meegegeven. Alleen een beheerder die een gebruiker aanmaakt in Instellingen bepaalt de rol. Voor gebruikers van Chronos verandert er niets",
  ],
  bekende_beperkingen: [],
  gebruikersactie: null,
};

// Oudste eerst; de nieuwste release hoort onderaan. package.json "version" moet gelijk zijn
// aan de laatste (zie de controle hieronder).
const CHANGELOG_ENTRIES = [RELEASE_1_0_0, RELEASE_1_1_0, RELEASE_1_2_0, RELEASE_1_3_0, RELEASE_1_4_0, RELEASE_1_5_0, RELEASE_1_6_0, RELEASE_1_7_0, RELEASE_1_8_0, RELEASE_1_9_0, RELEASE_1_10_0, RELEASE_1_10_1, RELEASE_1_10_2];

// Het versienummer in package.json en de nieuwste changelog-entry horen gelijk te lopen.
{
  const { readFileSync } = await import("node:fs");
  const pkgVersie = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const nieuwste = CHANGELOG_ENTRIES[CHANGELOG_ENTRIES.length - 1].versienummer;
  if (pkgVersie !== nieuwste) {
    console.error(
      `package.json versie (${pkgVersie}) wijkt af van de nieuwste changelog-entry (${nieuwste}). Werk ze beide bij.`
    );
    process.exit(1);
  }
}

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
  .upsert(CHANGELOG_ENTRIES, { onConflict: "versienummer", ignoreDuplicates: true });

if (error) {
  console.error("Wegschrijven van de changelog-entry is mislukt:", error.message);
  process.exit(1);
}

console.log(`✓ changelog bijgewerkt tot v${CHANGELOG_ENTRIES[CHANGELOG_ENTRIES.length - 1].versienummer}.`);
