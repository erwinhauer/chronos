# Patricia — technische referentie voor de koppeling met Chronos

*Laatst bijgewerkt: 2026-09-25. Dit is de verzamelde technische kennis over de*
*connectie met Patricia (Knijff's dossierbeheersysteem) — samengevoegd uit eerder*
*onderzoek, de IT-correspondentie over netwerktoegang, en de werkende (nog niet*
*gemergede) koppelingscode op `feature/patricia-koppeling`.*

**Belangrijk vooraf om te weten:** een groot deel van de inhoud hieronder (het
volledige veldenonderzoek, en de daadwerkelijke verbindingscode) bestaat vandaag
**alleen op de branch `feature/patricia-koppeling`** — niet op `beta`/`main`, waar
dit bestand wél staat. Zie §7 voor precies wat waar leeft.

## 1. Wat Patricia is, en waarom het ertoe doet

Patricia is Knijff's externe dossierbeheersysteem (SQL Server-database) — de bron
voor dossiergegevens, cliëntgegevens en (in de toekomst) billing addresses. Chronos
heeft vandaag (op `beta`/`main`) **geen live koppeling**: dossiernummers worden vrij
ingetypt en alleen client-side geparsed op formaat (`parseDossiernummer()`, zie
`documentation.md` §8). Op `feature/patricia-koppeling` is een werkende, read-only
koppeling gebouwd die dat vervangt — zie §7.

## 2. Verbindingsgegevens

| | |
|---|---|
| Server | `10.171.174.204` |
| Poort | `1433` (standaard SQL Server) |
| Instantie | Eén enkele SQL Server 2019-instantie voor alle Patricia-databases (geen apart geversieerde servers) |
| Authenticatie | NTLM (Windows-authenticatie), domein `knijff` |
| Driver (Node.js) | `mssql` (npm-package) |
| Env vars | `PATRICIA_DB_HOST`, `PATRICIA_DB_PORT` (default 1433), `PATRICIA_DB_NAME` (default `Patricia`), `PATRICIA_DB_DOMAIN`, `PATRICIA_DB_USER`, `PATRICIA_DB_PASSWORD` |
| Connectie-opties | `encrypt: true`, `trustServerCertificate: true`, `connectTimeout: 5000ms`, pool max 5 |
| Snelheid | Warme connectie: één lookup (2-3 tabellen joinen op `CASE_ID`) ~10-15ms. Koude connectie opzetten: ~180ms. Ruim snel genoeg voor live gebruik zolang de pool wordt hergebruikt, niet per request opnieuw opgezet. |

## 3. Meerdere databases op de server — welke is welke

Op `10.171.174.204` staan **vier** Patricia-databases naast elkaar, op dezelfde
instantie:

| Database | Doel | Status |
|---|---|---|
| `Patricia` | De echte **LIVE**-database van Knijff | Bevestigd door Erwin (2026-09-16). **Nooit op aansluiten voor development/testen** — een fout hierin raakt de productiedata direct. |
| `Patricia_Upgrade` | Testdatabase, maar met de **volledige** dataset (representatief voor echt testen, geen lege/dummy-kopie) | Bevestigd door Erwin (2026-09-16). |
| `Patricia_Intermediate` | Onbekend | Doel nog niet bevestigd. |
| `Patricia_Clean` | Onbekend | Doel nog niet bevestigd. |

**Aanbeveling voor de eerste live Chronos↔Patricia-koppeling: sluit eerst aan op
`Patricia_Upgrade`, niet op `Patricia`** — zo kan een fout tijdens het testen
(query, connectiebeheer, load) nooit per ongeluk de LIVE-data raken. Pas overstappen
naar `Patricia` zodra de koppeling bewezen stabiel is.

⚠️ `PATRICIA_DB_NAME` staat in `.env.example`/`.env.local` (en zou dat ook zijn op
Vercel) nu nog hardcoded op `Patricia` — die moet voor het eerste testen naar
`Patricia_Upgrade` gewijzigd worden.

## 4. Netwerktoegang — het onopgeloste kernprobleem

Patricia is **alleen bereikbaar vanaf het Knijff-netwerk** (getest: bereikbaar
vanaf een Mac op het kantoornetwerk/VPN, poort 1433 open). Chronos draait op
Vercel, dat daar niet op zit — zonder extra infrastructuur kan een Vercel-functie
deze database dus niet bereiken. Dit geldt evengoed voor KIP/OTMIS, als die ook
niet op het Knijff-netwerk draaien.

Vier architectuuropties zijn besproken (zie ook de conceptmail aan IT):

1. **Een kleine, beveiligde API binnen het Knijff-netwerk** — Chronos praat via
   HTTPS + een sleutel/token met een smalle, alleen-lezen API i.p.v. rechtstreeks
   met de database. Waarschijnlijk de veiligste, meest beheersbare optie.
2. **VPN-/tunnelverbinding** tussen Vercel en het Knijff-netwerk — meer werk aan
   IT-kant, maar een directe verbinding.
3. **Een lichte outbound-only tunnel** (bv. Cloudflare Tunnel, gratis) — een klein
   programma binnen het netwerk maakt zelf naar buiten toe verbinding; geen
   firewallpoort open, geen vast IP nodig. Praktische middenweg tussen 1 en 2.
4. **Periodieke export** (geen live verbinding) — voor redelijk stabiele data
   (bv. billing-adressen) een dagelijkse export i.p.v. live lookups; werkt niet
   goed voor dossiernummervalidatie, waar realtime nodig is.

Los daarvan: **Vercel's uitgaande IP-adressen zijn standaard niet vast** — een
vast IP kost $100/maand per project (Vercel Static IPs, Pro-plan) plus dataverkeer;
dat lost alleen de uitgaande kant op, geen inkomend vast IP, en werkt niet voor
middleware. Relevant als IT met IP-whitelisting op de firewall wil werken i.p.v.
een API-sleutel.

**Dit is nog niet opgelost** — de conceptmail aan IT (zie eerder in dit gesprek)
vraagt hier expliciet om, samen met de vraag welke van de vier databases (§3) voor
welk doel bereikbaar gemaakt moet worden.

## 5. Schema — dossiernummer als sleutel

**Chronos' eigen dossiernummer-conventie is exact hetzelfde format als Patricia's
`VW_CASE_NUMBER.CASE_NUMBER`** — geen transformatie nodig, alleen een directe
lookup:

```sql
SELECT CASE_ID FROM VW_CASE_NUMBER WHERE CASE_NUMBER = 'TM106410BX00'
```

Alle andere tabellen hangen aan dat `CASE_ID` (int). Case-type-specifieke velden
(bv. Type merk, Classes) hebben alleen betekenis voor het juiste `CASE_TYPE_CODE`
(`CASE_TYPE_DEFINITION` geeft alle 14 dossiertypes: TM, O = Oppositie, D = Design,
P = Patent, etc.).

### Rol-type-ID's op `CASTING` (dossier ↔ partij)

| `ROLE_TYPE_ID` | Betekenis | Gebruikt voor |
|---|---|---|
| 4 | Client | De klant/opdrachtgever op het dossier — bepaalt in Chronos welke klant het is |
| 5 | Account Address | Patricia's term voor **billing address** — er bestaat geen los adrestype "Billing" in `PAT_NAMES_ADDRESS_TYPE` |
| 20 | Renewal Address | Adres voor verlengingscorrespondentie |

Let op: Account Address (5) en Renewal Address (20) zijn vaak, maar niet altijd,
dezelfde partij/adres als Client (4) — altijd apart opvragen, nooit aannemen dat
ze gelijk zijn.

```sql
SELECT c.ROLE_TYPE_ID, rt.ROLE_TYPE_LABEL, a.ACTOR_ID, a.NAME1, a.ADR1, a.ADR2, a.ADR3, a.ADR4, a.ADR5
FROM CASTING c
LEFT JOIN CASE_ROLE_TYPE rt ON rt.ROLE_TYPE_ID = c.ROLE_TYPE_ID
LEFT JOIN ACTOR a ON a.ACTOR_ID = c.ACTOR_ID
WHERE c.CASE_ID = @case_id AND c.ROLE_TYPE_ID IN (4, 5, 20)
```

### Overige velden (volledige tabel: zie §7 — `patricia_fields.md`)

| Veld | Tabel(len) | Kolom |
|---|---|---|
| Merk (catchword) | `PAT_CASE` | `CASE_CATCH_WORD` |
| Type merk | `PAT_CASE` + `PAT_CASE_TM_CATEGORY` | `TRADE_MARK_CATEGORY` (1 letter: w=wordmark, d=device, etc.) |
| Application Date | `DIARY_DATE` + `DIARY_FIELD` | `FIELD_NUMBER = 3` |
| Application Number | `DIARY_TEXT` + `DIARY_FIELD` | `FIELD_NUMBER = 4` |
| Publication Date | `DIARY_DATE` + `DIARY_FIELD` | `FIELD_NUMBER = 11` |
| Registration Date | `DIARY_DATE` + `DIARY_FIELD` | `FIELD_NUMBER = 35` |
| Registration Number | `DIARY_TEXT` + `DIARY_FIELD` | `FIELD_NUMBER = 37` |
| Classes | `TRADE_MARK_CLASS` | `TRADE_MARK_CLASS` (bij `LANGUAGE_ID = 3` = Engels) |
| Classes Specification | `TRADE_MARK_CLASS` | `GOODS_TEXT` |
| Documents (metadata) | `PAT_DOC_LOG` | `DOC_NAME`, `DOC_FILE_NAME`, `LOG_DATE`, ... |
| Actions/workflow | `EVENT` + `EVENT_SCHEME` + `EVENT_SCHEME_TEXT` | zie join-patroon in `patricia_fields.md` |

**Logo's en documenten**: de database bevat alleen bestandsnamen/paden
(`PAT_CASE_PICTURE.CASE_PICTURE_PATH`, `PAT_DOC_LOG.DOC_FILE_NAME`), **geen
binaire inhoud**. Waar die bestanden fysiek staan is nog niet gevonden — zie §6.

## 6. Openstaande punten

1. **Netwerktoegang vanaf Vercel** (§4) — het blokkerende punt, ligt bij IT.
2. **Welke van de vier databases voor welk doel** (§3) — `Patricia_Intermediate`/
   `Patricia_Clean` zijn nog onbevestigd.
3. **Fysieke locatie van logo- en documentbestanden** — grondig onderzocht en
   uitgesloten binnen de SQL-database zelf (gecheckt: `CASE_TYPE_DEFINITION`/
   `CASE_MASTER`, `PAT_DOC_LOG.DOC_TYPE`/`CATEGORY_ID`, `PAT_DOC_CLASSIFICATION`,
   `PAT_DOWNLOAD_CASE_AREA`, `PAT_CASE_LOCATION(_DEF/_NEW)`, `PAT_CONTAINER_TYPE`,
   `PAT_DOC_DOCKETING_CONTAINER`, `PAT_DOCKETING_CONFIG` — geen enkele bevat een
   dossiertype-naar-mapnummer-koppeling). Leeft vermoedelijk op een bestandsshare
   of hardcoded in de Patricia-cliënt/NXT-configuratie — bij IT of iemand met
   Patricia-clienttoegang navragen (rechtermuisklik "open dossiermap").
4. **"Case Responsible" team** — geen vast veld op dossierniveau; `CASE_TEAM` is
   nagenoeg leeg (3 rijen firmbreed). Verantwoordelijkheid wordt per open actie
   bijgehouden (`EVENT.RESP_LOGIN_ID`), niet als vast dossierveld.
5. **Billing Address voor de facturatie-koppeling** (zie
   `plan-facturatie-vanuit-chronos.md` §5) — technisch nu wél beantwoord (Account
   Address, rol-ID 5, §5 hierboven); nog niet geïmplementeerd omdat dit op de
   nog niet gemergede `feature/patricia-koppeling`-branch staat en netwerktoegang
   (punt 1) nog ontbreekt.

## 7. Wat al gebouwd is — en waar het leeft

Op de branch **`feature/patricia-koppeling`** (nog niet gemerged naar `beta`/`main`)
bestaat al een werkende, read-only koppeling:

- **`patricia_fields.md`** (root, op die branch) — het volledige, uitgebreide
  veldenonderzoek waarvan §5 hierboven een samenvatting is. Geschreven als
  gedeeld referentiedocument voor Chronos **én** KIP/OTMIS (andere Knijff-systemen
  die ook uit Patricia lezen).
- **`src/lib/patricia.ts`** — de daadwerkelijke connectiecode (`mssql`, NTLM-auth,
  connection pooling) en `zoekDossierInfo(dossiernummer)`: zoekt een dossiernummer
  op (`VW_CASE_NUMBER` → `CASE_ID`), haalt `CASE_CATCH_WORD` (dossiernaam) en de
  Client-actor (rol-ID 4: naam, adres, `ACTOR_ID`) op. Geeft `null` terug als
  Patricia onbereikbaar is of het dossier niet bestaat — sinds 2026-09-04 is dit
  **geen "best effort" meer maar een harde vereiste**: een factuuritem kan niet
  aangemaakt worden zonder geldige Patricia-lookup.
- **`src/actions/patricia.ts`** — server-actions die dit ontsluiten richting de UI:
  `haalPatriciaDossierInfo()` (wrapper) en `vindOfMaakKlantVoorPatriciaActor()` —
  zoekt een bestaande `klanten`-rij op `patricia_id` (= Patricia's `ACTOR_ID`, de
  blijvende matching-sleutel) op, of maakt er automatisch één aan. Op deze branch
  bestaan "Chronos-klanten" dus niet meer los van Patricia: elke klant is een
  contact met de Client-rol op een Patricia-dossier.
- **`.env.example`** op die branch documenteert de env vars uit §2, met
  `PATRICIA_DB_HOST=10.171.174.204`, `PATRICIA_DB_DOMAIN=knijff` al ingevuld
  (gebruiker/wachtwoord leeg, in te vullen).

**Waarom dit nog niet op `beta` staat**: deze koppeling kan pas echt getest worden
zodra de netwerktoegang (§4) er is — Vercel kan de database vandaag niet bereiken.
Tot die tijd blijft de branch los van `beta`, met periodieke syncs vanaf `beta` om
divergentie te beperken (zie het git-workflowpatroon in `documentation.md` §3).

**Historisch, nu overbodig**: een tijdelijke dummy-tabel `patricia_dossiers`
(alleen input-UX/typeahead, géén echte Patricia-data) bestond van 2026-08-20 tot
2026-08-23 en is toen weer gedropt — dossiernummers worden sindsdien vrij ingetypt
op `beta`/`main`, in afwachting van deze echte koppeling.

## 8. Gerelateerde documenten

- [`documentation.md`](documentation.md) §8 — huidige (niet-)status van de koppeling in de architectuur van Chronos als geheel.
- [`plan-facturatie-vanuit-chronos.md`](plan-facturatie-vanuit-chronos.md) §5 — waarom Billing Address (nu technisch beantwoord, zie §5/§6 hierboven) een blokkerend punt was voor het facturatieplan.
- [`backlog.md`](backlog.md) — losse vervolgpunten.
- `patricia_fields.md` (op `feature/patricia-koppeling`) — het volledige veldenonderzoek, ook gedeeld met KIP/OTMIS.
