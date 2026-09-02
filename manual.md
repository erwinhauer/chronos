# Chronos — handleiding voor de testgroep

*Versie 0.1 — 2026-09-02. Dit document groeit mee tijdens de betafase; vul gerust aan
of geef door wat ontbreekt.*

## 1. Wat is Chronos, en waarom

Chronos is het nieuwe tijdschrijf- en facturatiesysteem van Knijff: één centrale plek
waar je uren, werkzaamheden en kosten vastlegt op het juiste dossier, en van waaruit
specificaties richting cliënten worden opgesteld.

Het doel is simpel: minder heen-en-weer tussen systemen, een duidelijk overzicht van
wat er per klant openstaat, en een controleerbare stap tussen "werk vastleggen" en
"declareren" — met alle wijzigingen vastgelegd in een logboek.

Chronos vervangt geen juridisch werk of advies — het is puur de administratieve laag
eromheen: tijdschrijven, factuuritems en specificaties.

*Deze handleiding staat ook, mooier opgemaakt met visuals, in de app zelf — via de
zijbalk onderaan, boven "Profiel". Dat is een los, met de hand opgemaakt scherm (geen
automatische render van dit bestand); bij een nieuwe stap of feature hier, dus ook
die pagina bijwerken.*

## 2. Belangrijkste features

- **Inloggen zonder wachtwoord** — een link per e-mail (magic link), geen wachtwoord
  om te onthouden of te resetten.
- **Dashboard** — omzet, onderhanden werk en voortgang richting target, gefilterd op
  periode en (afhankelijk van je rol) op team of de hele praktijk.
- **Factuuritems** — de basisregistratie: een werkzaamheid, gekoppeld aan één of
  meerdere dossiers van hetzelfde type, met tarief/uren of kosten.
- **Kopiëren** — een bestaand factuuritem hergebruiken als startpunt voor een nieuw
  item (bv. hetzelfde soort werk, ander dossiernummer) in plaats van alles opnieuw
  intypen.
- **Specificaties** — geselecteerde factuuritems bundelen tot een specificatie,
  met een keuze in detailniveau (simpel of met kosten/korting uitgesplitst), ter
  voorbereiding op de uiteindelijke factuur.
- **Wijzigingenlog** — elke aanpassing aan een factuuritem wordt vastgelegd: wat er
  wijzigde, door wie en wanneer.
- **Klanten-overzicht** — per klant terugzien hoeveel er ooit is gefactureerd, met
  een uitsplitsing per dossiertype en land, plus alle bijbehorende specificaties
  (als PDF-download).
- **Rollen** — Medewerker, Teamleider, Finance, Beheerder en Directie zien elk een
  andere selectie van het dashboard en mogen andere dingen (zie §3).

## 3. Rollen in Chronos (kort)

| Rol | Kan | Ziet |
|---|---|---|
| Medewerker | Eigen factuuritems aanmaken/bewerken/kopiëren | Eigen cijfers |
| Teamleider | Factuuritems van het eigen team, specificaties maken | Team-dashboard |
| Finance | Specificaties maken over alle klanten | Financieel overzicht |
| Beheerder | Alles, plus gebruikers-/teambeheer en instellingen | Alles |
| Directie | Alleen-lezen overzicht van de hele praktijk | Praktijkbreed dashboard |

Tijdens de testfase kan een beheerder via **Instellingen → Gebruikers → "Inloggen
als"** tijdelijk inloggen als een andere gebruiker, om te zien hoe Chronos er voor
die rol uitziet — handig om dit document te controleren of een melding te
reproduceren.

## 4. Stap voor stap: van inloggen tot definitieve specificatie

### 4.1 Inloggen

1. Ga naar de Chronos-testomgeving (link volgt van je testcoördinator).
2. Vul je e-mailadres in en klik op **"Stuur inloglink"**.
3. Je ontvangt binnen enkele seconden een e-mail met een inloglink. Klik daarop —
   je hoeft geen wachtwoord in te vullen of te onthouden.
4. Je komt automatisch op het **Dashboard** terecht.

*Geen mail ontvangen?* Check je spamfilter, en controleer of het juiste
e-mailadres is gebruikt bij het aanmaken van je account.

### 4.2 Het dashboard

Het dashboard toont, afhankelijk van je rol, een overzicht van:
- gefactureerde omzet en onderhanden werk voor de gekozen periode,
- voortgang t.o.v. het jaartarget,
- omzet per teamlid, klant, productgroep en land.

Gebruik de periode-selector rechtsboven om te wisselen tussen maand, kwartaal of
jaar. Dit scherm is puur informatief — je registreert hier niets.

### 4.3 Een nieuw factuuritem aanmaken

Dit is de kern van dagelijks gebruik: hier leg je vast wat je hebt gedaan.

1. Klik op **"Nieuw factuuritem"** (dashboard of Factuuritems-overzicht).
2. **Dossier(s)**: typ het dossiernummer en druk op Enter (of klik op het plusje).
   Je mag meerdere dossiers aan één factuuritem koppelen, **mits ze hetzelfde type**
   zijn (bv. twee Merken-dossiers, of twee Opposities) — een Merken- en een
   Oppositie-dossier combineren op één regel kan niet, en Chronos meldt dat direct
   als je het probeert. Land mag wel verschillen.
3. Vul per dossier de **dossiernaam** in (het merk/de zaak waar het om gaat).
4. Kies de **klant** (als die nog niet automatisch is ingevuld via het dossier) en
   eventueel een **project**.
5. Vul de **omschrijving voor de klant** in — dit is de tekst die uiteindelijk op de
   specificatie verschijnt. Een **interne opmerking** (optioneel) is nooit zichtbaar
   voor de klant.
6. Kies het **prijstype**: Uren (aantal × uurtarief) of Fixed fee (vast bedrag).
   Chronos stelt op basis van klant en medewerker een tarief voor; je kunt dit
   overschrijven.
7. Vul eventueel **kosten van derden** en/of **korting** in.
8. Controleer het **kantoorkosten**-vinkje (staat aan/uit afhankelijk van de
   klantinstelling) en of de regel **declarabel** is.
9. Rechts zie je continu de **"Overzicht regel"**-kaart meerekenen: honorarium,
   kosten van derden, korting, kantoorkosten en het totaal.
10. Klik op **"Factuuritem aanmaken"**.

### 4.4 Factuuritems per klant: bekijken, bewerken, kopiëren, verwijderen

Via **Factuuritems** in de zijbalk zie je alle klanten met openstaand werk; klik
een klant aan voor de volledige lijst van hun factuuritems.

Achter elke regel staat een menu (⋮) met drie acties:
- **Bewerken** — pas een nog niet gefactureerd item aan. Elke wijziging komt in het
  wijzigingenlog onderaan het bewerkscherm te staan.
- **Kopiëren** — opent een nieuw factuuritem, vooringevuld met alle gegevens van het
  origineel (dossier, omschrijving, tarief, kosten, korting), behalve de datum (die
  staat op vandaag) en de medewerker/het team (dat wordt jouw eigen account). Handig
  voor "hetzelfde soort werk, maar voor een ander dossiernummer" — pas alleen aan wat
  anders is en sla op. Werkt ook op al gefactureerde regels, want het origineel blijft
  onaangeroerd.
- **Verwijderen** — alleen mogelijk zolang een item nog niet gefactureerd is; vraagt
  eerst om bevestiging.

Staat er een oranje bolletje met een uitroepteken achter het dossiernummer? Dat
betekent dat er een interne opmerking op die regel staat — hover erover om de tekst
te lezen.

### 4.5 Een specificatie maken (Finance, Teamleider, Beheerder)

Een specificatie bundelt één of meer factuuritems van dezelfde klant (en hetzelfde
project) tot één geheel, ter voorbereiding op de factuur.

1. Vink op de klantpagina de gewenste factuuritems aan en klik op
   **"Specificatie maken (n)"**.
2. Vul eventueel een **extra korting** op de hele specificatie in.
3. Kies het **detailniveau**: standaard toont de specificatie alleen datum, dossier,
   omschrijving, aantal en totaalbedrag per regel. Vink **"Kosten van derden als
   aparte kolom tonen"** en/of **"Korting als aparte kolom tonen"** aan om ook die
   uitsplitsing (en het bijbehorende tarief/aantal) zichtbaar te maken — bijvoorbeeld
   omdat de klant dat wil zien.
4. Controleer het live voorbeeld van de specificatie eronder.
5. Klik op **"Download concept (PDF)"** om een watermerk-voorzien concept te
   bekijken/delen zonder al iets vast te leggen.
6. Tevreden? Klik op **"Bevestigen en specificatie maken"**. Let op: hierna staat de
   specificatie vast en kunnen de gekoppelde factuuritems niet meer worden gewijzigd
   — het daadwerkelijke factureren gebeurt vervolgens handmatig, buiten Chronos om.

Dat is de volledige route: van het vastleggen van een werkzaamheid tot de
**definitieve specificatie**.

## 5. Klantenoverzicht (Teamleider, Finance, Beheerder, Directie)

Via **Klanten** in de zijbalk zie je, per klant, hoeveel er ooit is gefactureerd
(alleen definitieve factuuritems tellen mee — nog openstaand werk staat hier niet
bij, dat blijft bij Factuuritems).

1. De lijst toont per klant het totaal gefactureerde bedrag, het aantal
   definitieve factuuritems en het aantal specificaties — klik een klant aan voor
   het detail.
2. Op de klantpagina zie je het totaal, plus een uitsplitsing **per dossiertype**
   (Merken, Opposities, etc.) en **per land**.
3. Daaronder staat de volledige lijst van definitieve factuuritems (alleen-lezen —
   deze zijn al gefactureerd en dus niet meer te wijzigen).
4. Onderaan staan alle specificaties die ooit voor deze klant zijn vastgelegd, elk
   met een knop om de PDF opnieuw te downloaden.

Zodra een factuuritem op een definitieve specificatie terechtkomt, verdwijnt het
automatisch uit de gewone Factuuritems-lijst bij de klant (die toont alleen nog
niet-gefactureerd werk) en verschijnt het hier.

## 6. Feedback geven tijdens de testfase

Loop je tegen iets vreemds aan, mis je iets, of is iets niet duidelijk? Meld dit bij
[testcoördinator/kanaal — aanvullen].
