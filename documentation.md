# Chronos — technische documentatie

*Laatst bijgewerkt: 2026-09-23.*

Dit is een **actuele momentopname** van hoe Chronos technisch in elkaar zit en waarom,
bedoeld voor een developer die het systeem voor het eerst onder ogen krijgt. Dit is
**geen changelog** — voor de chronologische geschiedenis van releases zie
[`livegang.md`](livegang.md). Dit bestand moet bij elke volgende feature/optimalisatie
worden bijgewerkt zodra die naar LIVE gaat, zodat het altijd de huidige werkelijkheid
weergeeft (zie ook de instructie hierover onderaan in [`AGENTS.md`](AGENTS.md)).

Gebruikersgerichte hulp staat in [`manual.md`](manual.md) en, mooier opgemaakt, in de
app zelf onder **Handleiding** — dat is een los, met de hand opgemaakt scherm
(`src/app/(app)/handleiding/page.tsx`), geen render van `manual.md`. Beide moeten
apart bijgewerkt worden.

## 1. Wat Chronos is

Chronos is het tijdschrijf- en specificatiesysteem van Knijff (IE-advocatuur/merkenbureau).
Medewerkers schrijven uren/werkzaamheden op dossiers, die worden gegroepeerd per klant
tot "factuuritems"; daaruit genereert het systeem een specificatie-PDF met de te
declareren werkzaamheden. **Chronos maakt en verstuurt zelf nog geen echte facturen** —
het genereren van de specificatie is het eindpunt; het daadwerkelijk factureren
(factuurnummer, versturen, boeken in AccountView) gebeurt vandaag handmatig, buiten
Chronos om. Zie [`plan-facturatie-vanuit-chronos.md`](plan-facturatie-vanuit-chronos.md)
voor het plan om dat uit te breiden.

## 2. Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript 5**, Tailwind CSS v4.
- **Supabase** (Postgres + PostgREST + Auth + Storage), lokaal via Docker
  (`supabase_*_Project_Chronos`-containers), remote op drie projecten: **LIVE**, **BETA**,
  **TEST**. `@supabase/ssr` voor server/client Supabase-clients.
- **`@react-pdf/renderer`** voor de specificatie-PDF (server-side gegenereerd, on-demand —
  zie §6.4).
- Vercel voor deploys.
- **Belangrijk — dit is niet de Next.js uit je trainingsdata**: er zijn breaking changes
  t.o.v. wat je van eerdere Next.js-versies kent. Lees `node_modules/next/dist/docs/`
  voordat je nieuwe Next.js-conventies aanneemt (zie `AGENTS.md`).

## 3. Omgevingen en git-workflow

Drie omgevingen, elk een eigen Supabase-project: **LIVE** (`main`-branch),
**BETA** (`beta`-branch), **TEST** (lokale Docker-instance, voor development).

- Standaard werk gebeurt op `beta` en gaat naar de BETA-omgeving.
- Promotie naar `main`/LIVE gebeurt **alleen op expliciet verzoek** van Erwin, per keer
  opnieuw (nooit automatisch "omdat het vorige keer ook mocht").
- Grotere features krijgen een eigen `feature/*`-branch (bv. `feature/patricia-koppeling`),
  die na elke beta-push gesynchroniseerd wordt (`git merge beta`) om divergentie te
  beperken.
- Elke push naar `beta` én elke promotie naar `main` krijgt een entry in
  [`livegang.md`](livegang.md) (narratief, chronologisch — wat, waarom, wanneer).
- Vóór elke commit: `npx tsc --noEmit` en `npm run lint` moeten schoon zijn.
- Commits/PR's eindigen met de Claude-attributieregel (zie repo-conventie in eerdere commits).

## 4. Rollen en autorisatie

**`user_role` enum**: `medewerker`, `teamleider`, `finance`, `beheerder`, `directie`.

Een profiel kan **meerdere rollen** hebben (`profile_roles`, many-to-many naar
`profiles`), met één "actieve rol" op enig moment (`switch_active_role(target_role)`,
gecontroleerd door `enforce_profile_self_edit_limits` welke rollen een gebruiker zelf
mag aannemen). RLS-policies checken tegen de **actieve** rol via
`current_role_name()`/`is_role(target)`, niet tegen alle toegewezen rollen.

Kernfuncties voor autorisatielogica (allemaal `security definer` Postgres-functies,
gebruikt binnen RLS-policies):

| Functie | Doet |
|---|---|
| `current_role_name()` | Actieve rol van de ingelogde gebruiker |
| `is_role(target)` | Is de actieve rol gelijk aan `target` |
| `is_active_user()` | Is het profiel niet gedeactiveerd |
| `shares_team_with(target_profile)` | Zit de ingelogde gebruiker in een team met `target_profile` |
| `team_services_klant(target_klant_id)` | Bedient een team van de ingelogde gebruiker deze klant |
| `switch_active_role(target_role)` | Wisselt actieve rol (met check dat gebruiker die rol heeft) |
| `set_klant_taal` / `set_klant_valuta` | Beheerder-only setters met neveneffecten (zie §7) |
| `supplement_klant_vanuit_hubspot(klant_id, adres, patricia_id)` | Vult adres/patricia_id aan vanuit HubSpot-koppeling, alleen als leeg |
| `resolve_tarief(klant_id, medewerker_id, datum)` | Bepaalt het geldende uurtarief (zie `tarieven`-tabel, per-klant/medewerker/datum-geldigheid) |

**Globaal patroon**: `medewerker` ziet/bewerkt vooral eigen werk binnen het eigen team;
`teamleider` ziet het hele team en kan factureren voor het team; `finance` en
`beheerder` hebben kantoorbrede leestoegang en factureringsrechten; `directie` heeft
brede leestoegang (o.a. voor dashboard-KPI's) maar geen schrijfrechten op operationele
data. Elke tabel heeft eigen, expliciete RLS-policies — er is geen "beheerder ziet
alles"-bypass; beheerder-rechten zijn per policy toegevoegd.

## 5. Datamodel

16 tabellen in `public`. De belangrijkste, met wat niet uit de kolomnaam zelf blijkt:

### `klanten`
Klant/opdrachtgever. `hubspot_id`/`patricia_id`/`accountview_debiteurnummer` zijn
koppel-ID's naar de drie externe systemen (zie §8) — **`accountview_debiteurnummer`
wordt vandaag nergens in de app gelezen of geschreven**, puur schema-scaffolding voor
een toekomstige AccountView-koppeling. `btw_percentage` (default 21.00) en
`btw_vermelding` (vrije tekst voor een afwijkend regime, bv. verlegd/export) zijn
**tijdelijk handmatig** door de beheerder instelbaar totdat de BTW-bepaling automatisch
uit een Patricia-koppeling kan komen (zie §9 en het facturatieplan) — ook deze twee
velden worden vandaag nergens in de UI/acties gebruikt. De `kolom_*_zichtbaar`-vlaggen
bepalen per klant welke kolommen op de specificatie/factuuritems-tabel getoond worden
(bv. uren, tarief, korting). `kantoorkosten_actief`/`kantoorkosten_percentage` sturen
de opslag in §7.2.

### `factuuritems`
Eén regel tijdschrijven/werkzaamheid. `status`: `aangemaakt` → `definitief` (definitief
zodra opgenomen in een specificatie-batch — zie §6). `qty`/`tarief`/`korting` kunnen
sinds de `factuuritem_negatief_bedrag`-migratie ook negatief zijn (deel-crediteren
**vóór** facturering, op regelniveau) — de korting-check (`korting <= honorarium`)
geldt alleen nog als het honorarium niet negatief is.

### `factuuritem_dossiers`
Koppeltabel: welke dossiers (kunnen er meerdere zijn) horen bij dit factuuritem, met
`matter_naam` (vrij ingevuld door de gebruiker sinds de Patricia-dummykoppeling is
weggehaald — zie §9) en `type_dienst`/`land` afgeleid uit het dossiernummer-formaat
(`parseDossiernummer()` in `src/lib/dossiernummer.ts`, puur client-side parsing van de
bekende Knijff-dossiernummerconventie, geen database-lookup).

### `facturatiebatches`
Een gegenereerde specificatie: groepeert factuuritems van één klant over één periode.
`status` (`batch_status` enum, zie §6) heeft méér waarden dan de app vandaag gebruikt —
zie §6 voor waarom. `totaal_kantoorkosten` is een **snapshot**, berekend eenmalig bij
het aanmaken van de batch (met een min-€15/max-€200 clamp) — nooit achteraf
reconstrueerbaar uit losse factuuritems; elke rapportage over kantoorkosten moet dus
optellen uit `facturatiebatches`, nooit benaderen via een regelberekening.
`goedgekeurd_door`/`goedgekeurd_op` leggen vast wie/wanneer de batch is goedgekeurd —
`goedgekeurd_op` is een `timestamptz` (met tijdstip), terwijl `factuuritems.datum` een
pure `date` is; bij doorlooptijdberekeningen (zie DWO in §7.3) moet je eerst de datum
uit de timestamptz halen (`.slice(0, 10)`), anders lekt het tijdstip-van-de-dag een
fractioneel-dag-verschil in de uitkomst.

### `specificaties`
**Vermoedelijk vestigiaal.** Kolommen suggereren een ouder ontwerp waarin
specificatie-PDF's eenmalig gegenereerd en in Supabase Storage opgeslagen werden
(`pdf_storage_path`), met een `vergrendeld`-vlag. De huidige implementatie genereert de
PDF juist **on-demand, bij elke download** (`genereerSpecificatiePdfBase64` /
`genereerConceptSpecificatiePdfBase64`, §6.4) en slaat niets op in Storage. De enige
plek waar deze tabel vandaag wordt aangeraakt is een FK-referentietelling in
`src/actions/admin.ts` (checken of een inactief profiel veilig verwijderd kan worden) —
er wordt nergens een rij in geschreven. Blijf hiervan bewust bij het lezen van het
schema: de tabel bestaat, maar draagt geen actieve data.

### `auditlog`
Append-only logboek van acties (`audit_actie` enum, zie §6). Heeft een
retentie-/opslaggrootte-mechanisme (`auditlog_opslaggrootte()`).

### `tarieven`, `teams`, `team_members`, `teamdoelen`, `profiles`, `profile_roles`,
### `projecten`, `landcodes`, `productchangelog`, `factuuritem_wijzigingen`
- `tarieven`: uurtarief per klant/medewerker met geldigheidsperiode; `resolve_tarief()`
  bepaalt wat op een gegeven datum geldt. Standaard uurtarief €330 als er geen
  klant/medewerker-specifiek tarief geldt.
- `teams`/`team_members`: teamindeling; `teams.email` is een team-e-mailadres
  (vandaag ongebruikt in de app — potentieel relevant als reply-to/CC-adres zodra
  Chronos zelf e-mails gaat versturen, zie facturatieplan).
- `teamdoelen`: jaarlijkse omzetdoelen per team (voor de dashboard-KPI's).
- `profiles`: gebruikersprofiel; `voornaam`/`achternaam` los van het samengestelde
  `full_name`.
- `landcodes`: ISO-landcode → naam, incl. groepen zoals EU/OAPI/wereldwijd — gebruikt
  om uit het dossiernummer het land af te leiden.
- `productchangelog`: wat de "Wat is er nieuw"-changelog in de app voedt (niet te
  verwarren met `livegang.md`, dat is de interne/technische versie).
- `factuuritem_wijzigingen`: audit-trail van velden die op een factuuritem gewijzigd
  zijn (voor het wijzigingenlog dat je op een bewerkt factuuritem ziet).

## 6. Levenscyclus: factuuritem → specificatie

1. Medewerker maakt een factuuritem aan → `status = aangemaakt`.
2. Teamleider/finance/beheerder selecteert factuuritems van één klant en genereert een
   specificatie (`genereerSpecificatie()`, `src/actions/specificaties.ts`):
   - Maakt een `facturatiebatches`-rij met **hardcoded `status: "gefactureerd"`**
     (regel 111 van dat bestand) — er is geen tussenstap.
   - Zet de betrokken factuuritems op `status: "definitief"`.
3. De specificatie-PDF wordt **on-demand** gegenereerd bij elke download/preview
   (`src/actions/specificatie-download.ts`), niet éénmalig opgeslagen.

### 6.1 Enum-scaffolding die verder gaat dan de huidige implementatie

`batch_status` heeft 4 waarden: `concept`, `batch_goedgekeurd`, `geexporteerd`,
`gefactureerd` — de app gebruikt vandaag alleen de eerste (kolom-default) en de
laatste (hardcoded bij aanmaken). `audit_actie` heeft 10 waarden: `aanmaken`,
`wijzigen`, `indienen`, `goedkeuren`, `terugsturen`, `exporteren`, `vergrendelen`,
`heropenen`, `corrigeren`, `inloggen_als` — geverifieerd (grep over `src/`) dat alleen
een klein deel hiervan vandaag daadwerkelijk door app-code wordt geschreven; de rest
(`indienen`/`goedkeuren`/`terugsturen`/`exporteren`/`vergrendelen`/`heropenen`/
`corrigeren`) komt alleen voor in de migratie die het type definieert en in de
gegenereerde `database.types.ts`.

**Dit is geen dode code om op te schonen** — het is schema-ontwerp dat al vooruitliep
op een volwaardige concept → goedgekeurd → geëxporteerd (naar boekhouding) →
gefactureerd-workflow, die er destijds bewust nog niet kwam (zie §6.2). Bouw een
toekomstige facturatie-workflow **op deze enums voort**, in plaats van een nieuwe state
machine te ontwerpen.

### 6.2 Eerder gebouwd én weer teruggedraaid

Op 2026-08-21/23 is een eerdere, verdergaande facturatie-implementatie gebouwd én
**weer expliciet teruggedraaid** ("te veel haken en ogen zolang Accountview/Patricia er
niet zijn" — commit-boodschap van de drop-migratie). Wat toen bestond en weer is
weggehaald van `facturatiebatches`: `accountview_factuurnummer`,
`accountview_factuurdatum`, `verzend_email`, `verzend_cc`, `verzonden_op`,
`verzend_fout`, `factuur_storage_path`, `specificatie_storage_path`, `btw_percentage`,
`btw_bedrag`, `btw_vermelding`; van `klanten`: `verzending_toegestaan`. Er stond een
Storage-bucket "facturen" met bijbehorende policies voor finance-rollen — de bucket
bestaat nog (leeg, dode gewicht), de policies zijn verwijderd. **Belangrijk
architectuurprincipe dat uit deze migraties naar boven komt**: alles dat op een
factuur/specificatie verschijnt (BTW-percentage, BTW-bedrag, kantoorkosten) wordt op
het moment van factureren **gesnapshot** op de batch, nooit live vanuit `klanten`
gejoined — anders verandert een latere BTW-regimewijziging met terugwerkende kracht
een al verstuurde factuur. Zie het facturatieplan voor hoe dit teruggedraaide werk als
uitgangspunt dient.

## 7. Kernberekeningen

### 7.1 `berekenFactuurtotalen()`
Berekent `totaal_honorarium`, `totaal_externe_kosten`, `totaal_korting`,
`totaal_kantoorkosten`, `totaal_bedrag` bij het aanmaken van een specificatie-batch.

### 7.2 Kantoorkosten
Percentage (`klanten.kantoorkosten_percentage`, standaard 6%) over het honorarium,
met een **min-€15/max-€200-clamp per batch** — alleen aan/uit en het percentage zijn
per klant instelbaar (`kantoorkosten_actief`). Zie §5 (`facturatiebatches`) voor de
snapshot-regel.

### 7.3 DWO (doorlooptijd van werkzaamheid tot omzet)
Waarde-gewogen gemiddelde van `(facturatiebatch.goedgekeurd_op-datum − factuuritem.datum)`
voor items waarvan de batch in de gekozen periode is goedgekeurd. Zie §5
(`facturatiebatches`) voor de timestamptz/date-valkuil.

### 7.4 Periode-filters (dashboard)
`src/lib/omzet-periode.ts` — een gedeeld `Periode`-type (`ytd`/`mtd`/`jaar`/`maand`/
`kwartaal`/`halfjaar`/`rolling3m`) met per-tegel toegestane subsets
(`ALLE_PERIODES`/`MEDEWERKER_PERIODES`/`DWO_PERIODES`), gestuurd via query-params zodat
meerdere tabellen op één dashboardpagina onafhankelijk filterbaar zijn
(`TabelPeriodeSelect`-component, één per tabel/tegel).

## 8. Externe koppelingen

| Systeem | Status | Wat |
|---|---|---|
| **HubSpot** | Live, read/aanvullend | `supplement_klant_vanuit_hubspot()` vult `adres`/`patricia_id` aan op een klant, **alleen als nog leeg** — geen overschrijving van handmatig ingevoerde data. |
| **Patricia** (dossierbeheersysteem) | **Niet live gekoppeld.** | De tijdelijke dummy-tabel (`patricia_dossiers`, typeahead-databron) is bewust gedropt; dossiernummers worden vandaag **vrij ingetypt** en client-side geparsed (`parseDossiernummer()`) voor type/land — geen enkele externe lookup. Een échte koppeling wordt gebouwd op `feature/patricia-koppeling` (async validatie bij het toevoegen van een dossiernummer, met een `bezig`-state tijdens de check) — nog niet op `beta`/`main`. Los onderzoek (zie `_backlog/Chronos - Backlog.docx`) naar de Patricia SQL-database (`10.171.174.204`, database "Patricia") voor dossiertype→fileserver-mapnummer leverde geen directe koppeltabel op; er zijn bovendien **meerdere gelijknamige Patricia-databases** op die server — welke de live/actuele is, is nog niet bevestigd bij IT. |
| **AccountView** (boekhouding) | **Geen koppeling.** | `klanten.accountview_debiteurnummer` bestaat als schema-scaffolding, wordt nergens gebruikt. Nog niet bepaald of een toekomstige koppeling API-based of (semi-)handmatige import wordt. |

## 9. Bekende, bewuste tussentoestanden (niet per ongeluk "kapot")

- `klanten.btw_percentage`/`btw_vermelding`: handmatig ingesteld, bedoeld als
  tijdelijke stand-in tot Patricia/AccountView automatische BTW-bepaling mogelijk
  maakt.
- `factuuritem_dossiers.matter_naam`: handmatig ingetypt per dossier, tot een echte
  Patricia-koppeling de dossiernaam automatisch kan aanleveren.
- `specificaties`-tabel: vermoedelijk vestigiaal (zie §5) — niet verwijderen zonder
  eerst te bevestigen dat er geen historische afhankelijkheid is; wel iets om
  op te ruimen zodra dat bevestigd is.
- `batch_status`/`audit_actie`-enumwaarden die de app niet gebruikt (zie §6.1): bewust
  vooruitlopend schema-ontwerp voor een facturatie-workflow, geen dode code.

## 10. Openstaand (bekend, niet in de scope van dit document om op te lossen)

Zie [`backlog.md`](backlog.md) en `_backlog/Chronos - Backlog.docx` voor het volledige,
losse ideeënoverzicht (buiten git getrackt; alleen lokaal). Direct architectuur-relevant:
back-ups/PITR-beslissing voor LIVE/BETA (nog niet gemaakt), en de open vraag welke van de
meerdere Patricia-databases op de server de live versie is.
