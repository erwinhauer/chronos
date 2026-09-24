# Plan van aanpak — factureren vanuit Chronos

*Status: planning-only, nog niets uitgerold. 2026-09-23.*

Dit document beantwoordt de vraag: hoe komen we van "Chronos genereert een
specificatie" naar "Chronos verstuurt de factuur + specificatie, en de boeking komt
in AccountView terecht" — zonder crediteren (dat blijft in AccountView). Zie
[`documentation.md`](documentation.md) §6 voor de huidige factuuritem-/
specificatie-levenscyclus waarop dit voortbouwt.

## 0. Dit is niet nieuw terrein — wat er al is

Twee dingen zijn belangrijk om te weten voordat je dit als een greenfield-feature
behandelt:

1. **Dit is al eens gebouwd en bewust teruggedraaid** (2026-08-21 t/m 23). Er bestonden
   al kolommen voor accountview-factuurnummer/-datum, verzend-e-mailadres/cc,
   verzonden-op, verzendfout, aparte PDF-storage-paths voor factuur en specificatie,
   en een BTW-snapshot op de batch — plus een Storage-bucket "facturen" met
   finance-only policies. Reden voor de terugdraai: *"te veel haken en ogen zolang
   Accountview/Patricia er niet zijn"*. Die reden is vandaag **nog steeds waar** — geen
   van beide koppelingen bestaat. Dit plan moet dus expliciet zeggen wat er verandert
   waardoor het nu wél kan, of anders erkennen dat we bewust met een tussenoplossing
   starten (zie §5).
2. **Het schema loopt al op een workflow vooruit.** `batch_status` heeft naast
   `concept` en `gefactureerd` ook `batch_goedgekeurd` en `geexporteerd`; `audit_actie`
   heeft naast wat vandaag gebruikt wordt ook `indienen`, `goedkeuren`, `terugsturen`,
   `exporteren`, `vergrendelen`, `heropenen`, `corrigeren`. Bouw de nieuwe workflow
   **op deze waarden voort** (zie §2) in plaats van een parallelle state machine te
   verzinnen.

De oorspronkelijke, uitgebreidere backlog-notitie (`_backlog/Chronos - Backlog.docx`,
niet in git) beschrijft al een vrij volledige visie op deze flow — dit plan volgt die
visie, met de destijds al genoemde openstaande vragen expliciet benoemd.

## 1. Scope

**Binnen scope:**
- Specificatie + factuur samen versturen (mail) vanuit Chronos, handmatig of
  geautomatiseerd op een datum.
- Aparte, doorlopende factuurnummerreeks.
- Automatische BTW-typebepaling (NL, EU met/zonder verlegging, buiten-EU).
- Ophalen van Billing Addresses uit Patricia.
- Data naar AccountView na het factureren.
- Reporting op de nieuwe factuurstatussen.

**Buiten scope (expliciet):**
- Crediteren — blijft in AccountView.
- (Voor dit plan buiten scope, maar wel een randvoorwaarde eromheen, zie §5): de
  échte Patricia-koppeling voor dossiernummer-validatie (`feature/patricia-koppeling`)
  en de vraag welke Patricia-database op de server (`10.171.174.204`) de live versie is.

## 2. Voorgestelde levenscyclus — bouwt voort op bestaande enums

```
concept  →  batch_goedgekeurd  →  geexporteerd  →  gefactureerd
(bestaat)   (bestaat, ongebruikt) (bestaat, ongebruikt) (bestaat, kortgesloten)
```

Vandaag zet `genereerSpecificatie()` een batch **direct** op `gefactureerd` bij
aanmaken (`src/actions/specificaties.ts:111`). Voorstel voor de nieuwe flow:

1. **`concept`** — specificatie is gegenereerd (huidige eindpunt), nog niet
   goedgekeurd om te versturen. Dit is het moment voor het voorbeeldscherm dat de
   backlog-notitie beschrijft: gebruiker ziet voorbeeldfactuur + specificatie, kan
   e-mailadres(sen)/cc en factuurgegevens nog aanpassen.
2. **`batch_goedgekeurd`** — na een "Weet je het zeker?"-bevestiging. Dit is het
   moment om het **factuurnummer** toe te kennen (zie §3) en alle factuur-velden
   (BTW-percentage/-bedrag/-vermelding, billing address) te **snapshotten** op de
   batch — nooit live joinen vanuit `klanten`, exact zoals `totaal_kantoorkosten`
   vandaag al werkt (zie `documentation.md` §6.2). `audit_actie: goedkeuren`.
3. **`geexporteerd`** — de PDF's zijn verstuurd (e-mail aan debiteur + kopie aan het
   team) én de boekingsgegevens zijn naar AccountView gestuurd. `audit_actie:
   exporteren`. Faalt het versturen? Dan blijft de batch op `batch_goedgekeurd` staan
   met een foutveld (zoals het teruggedraaide `verzend_fout` deed) — niet stilzwijgend
   doorschieten naar `geexporteerd`.
4. **`gefactureerd`** — bevestigd verstuurd én geboekt; dit is het huidige "eindpunt",
   nu met echte betekenis in plaats van meteen bij aanmaken gezet.

`terugsturen`/`heropenen`/`corrigeren` (bestaande `audit_actie`-waarden) passen op de
correctiepaden: een factuur die vóór verzending nog terug moet naar de vorige stap.

## 3. Factuurnummerreeks

Aparte, oplopende reeks, los van interne id's. **Beslist: één reeks, kantoorbreed** —
niet per team, niet per valuta/entiteit (ook niet voor de losse USD-facturatie-wens uit
de backlog; die krijgt geen eigen reeks).

Nog wel te beslissen bij uitwerking (niet hier al beantwoord):
- Toekenning **op het moment van goedkeuren** (stap 2 hierboven), niet bij aanmaken
  van de specificatie — anders ontstaan gaten in de reeks zodra een concept wordt
  verwijderd zonder ooit verstuurd te zijn.
- Een Postgres-sequence met een unique constraint op het uiteindelijke nummer is de
  voor de hand liggende implementatie; moet transactioneel samen met de
  status-overgang naar `batch_goedgekeurd` gebeuren om nooit een nummer te "verspillen"
  bij een gefaalde transactie.

## 4. BTW-typebepaling

Vandaag: `klanten.btw_percentage` (default 21%) en `klanten.btw_vermelding` (vrije
tekst) zijn **handmatig door de beheerder** ingesteld — geen automatische afleiding,
en beide velden worden nergens in de UI getoond of bewerkt (zuiver schema-scaffolding,
zie `documentation.md` §5). Voorstel voor automatische bepaling:

| Situatie | BTW | Vermelding |
|---|---|---|
| Klant in Nederland | 21% (of het geldende NL-tarief) | — |
| Klant in EU, geen omgekeerde heffing | Land-specifiek tarief òf NL-tarief (juridisch te bepalen door het kantoor, niet door Chronos — zie de bestaande `btw_vermelding`-comment: *"Chronos verzint geen juridische tekst"*) | evt. verplichte vermelding |
| Klant in EU, B2B met geldig BTW-nummer (verlegd) | 0% | "BTW verlegd naar de afnemer conform Art. 44 Btw-richtlijn" (exacte tekst door het kantoor te bepalen) |
| Klant buiten de EU | 0% | "Buiten de EU — geen BTW van toepassing" (exacte tekst door het kantoor te bepalen) |

Land wordt afgeleid uit het klantadres (Billing Address, zie §5) of uit de bestaande
`landcodes`-tabel via het dossierlandcode-mechanisme. **Chronos bepaalt het regime,
niet de juridische bewoording** — dat blijft, net als vandaag, een door het kantoor
ingevoerde vrije tekst per regime-categorie (niet meer per individuele klant met de
hand getypt, wel een door het kantoor beheerde set standaardteksten per categorie).
Het resultaat wordt **gesnapshot** op de batch bij goedkeuring (§2, stap 2) — een
latere adres- of regimewijziging van de klant mag nooit een al verstuurde factuur
met terugwerkende kracht veranderen (zelfde principe als de teruggedraaide
`facturatiebatches.btw_percentage`-snapshot destijds al implementeerde).

## 5. Patricia — Billing Address

**Open onderzoek, niet iets wat dit plan zelf kan afronden.** Er is nog geen live Patricia-
koppeling (zie `documentation.md` §8) — alleen een in-ontwikkeling dossiernummer-
validatiekoppeling op `feature/patricia-koppeling`, die niets met billing-adressen
te maken heeft. Bekend uit eerder onderzoek (backlog-notitie, 3/15 sept. 2026): directe
SQL-toegang tot een Patricia-database bestaat (`10.171.174.204`, database "Patricia"),
maar er zijn **meerdere gelijknamige databases** op die server en nog niet bevestigd
welke de live/actuele is — en dat onderzoek keek naar dossiertype→fileservermap, niet
naar billing-adresvelden. Voordat dit gebouwd kan worden, moet iemand met
Patricia-clienttoegang (of IT) bevestigen: (a) welke database live is, (b) in welke
tabel/velden het billing address (afwijkend van het correspondentieadres?) staat.
**Tot die tijd**: BTW-land/adres komt uit `klanten.adres` (handmatig, zoals vandaag),
met een duidelijk gemarkeerd "voorlopig handmatig, wordt later Patricia"-label in de
UI — zelfde patroon als de bestaande `btw_percentage`-comment in het schema.

## 6. Versturen (e-mail)

- Geen bestaande e-mail-dependency in het project (geen Resend/Nodemailer o.i.d.) —
  dit vergt een nieuwe integratie. Resend is de voor de hand liggende keuze gezien
  Supabase/Vercel-context, maar niet hier al vastgelegd.
- Voorbeeldscherm (concept-status, §2 stap 1): factuurgegevens, e-mailadres(sen)
  (to/cc) bewerkbaar, met "Weet je het zeker?"-bevestiging voor verzenden — exact het
  patroon dat de backlog-notitie al beschrijft.
- Bij verzenden: PDF (factuur + specificatie, twee losse documenten — zoals de
  teruggedraaide implementatie ook al deed met `factuur_storage_path` +
  `specificatie_storage_path`) naar de debiteur; kopie naar het team
  (`teams.email` bestaat al als kolom, vandaag ongebruikt — geschikte plek voor het
  reply-to/CC-adres van de teamkopie).
- **Automatisch versturen op een datum** (expliciet genoemd in de oorspronkelijke
  vraag): een scheduled job (Supabase cron/Edge Function of Vercel cron) die batches
  in `batch_goedgekeurd`-status met een ingestelde verzenddatum oppikt. Vergt een
  nieuw datumveld op de batch (bv. `verzenden_op`) — bewust apart van
  `goedgekeurd_op`, want goedkeuren en de geplande verzenddatum zijn twee losse
  momenten.
- Kopie-naar-Patricia-dossier (backlog-notitie noemt dit als onderdeel van de
  oorspronkelijke visie: *"Een kopie van de factuur wordt in alle dossiers die
  genoemd zijn in de specificatie gehangen"*) vergt schrijftoegang tot Patricia, niet
  alleen leestoegang voor Billing Address — grotere afhankelijkheid, waarschijnlijk
  een latere fase dan de eerste versie van deze feature.

## 7. AccountView

**⚠️ Spanning met de eerdere beslissing hierboven — nog niet opgelost.** Eerder in dit
plan is vastgelegd: *"Wat naar AccountView gaat is uitsluitend factuurdata op
factuurniveau [...] geen specifieke productcodes, dossiernummers of regeldetail."*
Uit het echte, vandaag al gebruikte AccountView-importformaat (zie
[`facturatie-accountview-mapping.md`](facturatie-accountview-mapping.md), op basis van
drie exportbestanden die IT ter illustratie deelde) blijkt dat AccountView's
bestaande importmechanisme juist **regelniveau** verwacht: artikelcode, aantal,
omschrijving en prijs per regel (`soi_line.*`), niet alleen een factuurtotaal. Dat is
op zijn minst hoe het vandaag werkt voor het centraal factureren van
merkbewakings-/verlengingsfacturen — mogelijk (nog niet bevestigd) is dat een apart,
ander proces dan wat Chronos zelf zou aanleveren, maar het is het enige concrete
bewijs dat we hebben van hoe AccountView facturen binnenkrijgt.

**Dit moet expliciet opnieuw besloten worden, niet stilzwijgend overschreven**: ofwel
(a) de eerdere beslissing blijft staan en Chronos levert alleen totalen — dan moet
bevestigd worden dat AccountView een totalen-only importpad heeft (naast, of in plaats
van, het regelniveau-formaat hierboven); ofwel (b) de regeldetail-eis van het bestaande
importformaat is een technisch gegeven waar niet omheen te werken is, en de eerdere
"geen productcodes/regeldetail"-beslissing moet herzien worden. Zie
`facturatie-accountview-mapping.md` §6 voor de volledige veldmapping en de gaten die
dat blootlegt (met name: Chronos heeft vandaag geen productcatalogus/artikelcodes,
wat hoe dan ook nodig is zodra regelniveau-export aan de orde is).

**Wél al opgehelderd t.o.v. de vorige versie van dit plan**: de vraag "API of
(semi-)handmatige import" is niet langer volledig open — IT gebruikt vandaag al een
**bestandsgebaseerde import** (drie CSV's per exportmoment) voor een ander,
vergelijkbaar facturatieproces. Dat is een bewezen, laag-risico precedent om naar toe
te bouwen; een eventuele API blijft een losse, latere vraag (zie
`facturatie-accountview-mapping.md` §8-9 voor het volledige advies en de
vervolgvragen voor de DBA).

`klanten.accountview_debiteurnummer` bestaat al (leeg, ongebruikt) — bedoeld om het
debiteurnummer aan een klant te koppelen zodat de export/koppeling weet welke
AccountView-debiteur het betreft.

## 8. Reporting

Nieuwe statussen (§2) maken reporting op "openstaand om te versturen" /
"verstuurd, nog niet geëxporteerd" / "geëxporteerd, nog niet bevestigd geboekt"
mogelijk — vandaag onmogelijk omdat alles direct op `gefactureerd` springt. Voorstel:
een dashboardtegel "Facturatiestatus" (analoog aan de bestaande DWO-/kantoorkosten-
tegels in `documentation.md` §7) die per status telt hoeveel batches/bedrag erin
staan, voor finance/beheerder/directie.

Omdat AccountView per §7 alleen factuurniveau-data krijgt, blijft Chronos de enige
plek waar op casetype/land/dossierdetail gerapporteerd kan worden (bestaande
verkochte-diensten-per-type/per-land-wens uit de backlog-notitie) — dat detail leeft
en blijft leven in Chronos' eigen tabellen, niet in AccountView.

## 9. Wat expliciet niet hier wordt opgelost

- Crediteren (blijft AccountView).
- De échte Patricia-dossiernummervalidatie (apart, al in ontwikkeling op
  `feature/patricia-koppeling`).
- Welke Patricia-database live is (IT-vraag, niet een Chronos-buildvraag).
- AccountView's daadwerkelijke integratiemogelijkheden (vergt input van wie
  AccountView beheert).
- De exacte juridische BTW-vermeldingsteksten per regime (kantoor/fiscalist, niet
  Chronos).

## 10. Volgorde van uitwerken (voorstel, geen commitment)

1. Beantwoord de twee blokkerende open vragen (AccountView-integratiemethode,
   Patricia-billing-address-locatie) — zonder die twee is elke schatting van scope
   giswerk.
2. Bouw de status-tussenstappen (§2) en het voorbeeldscherm/bevestiging, zonder
   automatisch versturen en zonder AccountView-export — dit alleen al vervangt de
   huidige "direct naar gefactureerd springen"-kortsluiting door een controleerbare
   stap, en is los waardevol.
3. Factuurnummerreeks + BTW-snapshot (§3, §4) — met handmatige billing-adressen
   (§5, tussenoplossing) totdat Patricia er is.
4. E-mail versturen (handmatig eerst, automatisch-op-datum als latere sub-stap).
5. AccountView-export (CSV eerst, API als die er komt).
6. Patricia Billing Address + kopie-naar-dossier, zodra de koppeling er is.
