# Patricia — velden voor Chronos, KIP en OTMIS

*Versie 0.1 — 2026-09-03. Referentiedocument voor systemen die gegevens uit
Patricia moeten lezen (Chronos, KIP, OTMIS). Alles hieronder is **read-only**
geverifieerd tegen de echte Patricia-database (SQL Server, `10.171.174.204`,
database `Patricia`) via Windows-authenticatie. Geen enkele query hieronder
schrijft data.*

## Belangrijk vooraf

- **Dossiernummer = de sleutel.** Chronos' eigen dossiernummer-conventie
  (bv. `O26921PL00`, `TM106410BX00`) is **exact** hetzelfde format als
  Patricia's eigen `VW_CASE_NUMBER.CASE_NUMBER` — geen transformatie nodig,
  alleen een directe lookup. Vertrekpunt voor bijna elke query hieronder:
  ```sql
  SELECT CASE_ID FROM VW_CASE_NUMBER WHERE CASE_NUMBER = 'TM106410BX00'
  ```
  Alle andere tabellen hangen aan dat `CASE_ID` (int).
- **Netwerk.** Deze database is alleen bereikbaar vanaf het Knijff-netwerk
  (getest: bereikbaar vanaf een Mac op het kantoornetwerk/VPN, poort 1433
  open). Vercel-servers (waar Chronos op draait) zitten daar niet op — voor
  een live koppeling vanuit Chronos is een VPN-tunnel of gateway naar buiten
  nodig. Dit geldt evengoed voor KIP/OTMIS als die niet op het Knijff-netwerk
  draaien.
- **Snelheid.** Met een warme connectie is een enkele lookup (2-3 tabellen
  joinen op CASE_ID) **~10-15ms**. Een koude connectie opzetten kost ~180ms.
  Ruim snel genoeg voor live gebruik zolang de connectie/pool wordt hergebruikt
  in plaats van per request opnieuw opgezet.
- **Case-type filter.** Merk-specifieke velden (Type merk, Classes, Classes
  Specification) hebben alleen betekenis voor `CASE_TYPE_CODE = 'TM'`
  (Trade Mark). De `CASE_TYPE_DEFINITION`-tabel geeft alle 14 dossiertypes
  (TM, O = Oppositie, D = Design, P = Patent, etc.).

---

## 1. Merk (Catchword)

| | |
|---|---|
| **Tabel** | `PAT_CASE` |
| **Kolom** | `CASE_CATCH_WORD` (nvarchar(120)) |
| **Join** | `PAT_CASE.CASE_ID = VW_CASE_NUMBER.CASE_ID` |
| **Voorbeeld** | `TM106410BX00` → `EU VAT COMPASS` |

## 2. Type merk (word mark / device mark / etc.)

| | |
|---|---|
| **Tabel** | `PAT_CASE` + lookup `PAT_CASE_TM_CATEGORY` |
| **Kolom** | `PAT_CASE.TRADE_MARK_CATEGORY` (1 letter) → join op `PAT_CASE_TM_CATEGORY.TRADE_MARK_CATEGORY` voor het label |
| **Waarden** | `w`=wordmark (197k, verreweg de meeste), `k`=word/device b&w, `m`=word/device kleur, `d`=device b&w, `x`=other, `h`/`i`=special b&w/kleur, `e`=device kleur, `a`=3D mark, `y`=wordmark non-latin, `b`=slogan, `c`=colour, `g`=sound, `f`=smell (`l`=logotype is inactief) |
| **Let op** | Bestaat los van `PAT_CASE_TM_TYPE` (Collective/Individual/Certification mark) — dat is een ándere dimensie (eigendomsvorm, niet merkvorm). Voor "word mark vs. device mark" is `TRADE_MARK_CATEGORY` het juiste veld. |
| **Voorbeeld** | ~6.900 dossiers hebben dit veld leeg (ongetypeerd) — hou daar rekening mee. |

## 3. Dossiernummer

| | |
|---|---|
| **Tabel** | `VW_CASE_NUMBER` |
| **Kolom** | `CASE_NUMBER` (nvarchar(40)) — het opzoek-format; `CASE_NUMBER_SORT` voor sorteerbare variant |
| **Join** | `CASE_ID` naar alle andere tabellen |
| **Voorbeeld** | `TM106410BX00`, `O26921PL00`, `G30567CN00` |

## 4. Client

| | |
|---|---|
| **Tabel** | `CASTING` (rol) + `ACTOR` (naam/adres) |
| **Kolom** | `CASTING.ROLE_TYPE_ID = 4` ("Client") → `CASTING.ACTOR_ID` → `ACTOR.NAME1/2/3`, `ACTOR.ADR1-5` |
| **Join** | `CASTING.CASE_ID = <CASE_ID>` |
| **Voorbeeld** | `TM106410BX00` → Stichting Internationaal Belasting Documentatie Bureau, Rietlandpark 301 |

## 5. Billing Address

| | |
|---|---|
| **Tabel** | `CASTING` + `ACTOR` |
| **Kolom** | `CASTING.ROLE_TYPE_ID = 5` ("Account Address" — dit ís Patricia's term voor billing address; er bestaat geen apart adrestype "Billing" in `PAT_NAMES_ADDRESS_TYPE`, dat kent alleen "Office Address") |
| **Let op** | Vaak dezelfde actor/adres als Client (zoals in het voorbeeld hieronder), maar kan afwijken — altijd apart opvragen, niet aannemen dat het gelijk is aan Client. |
| **Voorbeeld** | `TM106410BX00` → zelfde partij als Client in dit geval |

## 6. Renewal Address

| | |
|---|---|
| **Tabel** | `CASTING` + `ACTOR` |
| **Kolom** | `CASTING.ROLE_TYPE_ID = 20` ("Renewal Address") |
| **Voorbeeld** | `TM106410BX00` → zelfde partij als Client in dit geval |

**Query voor 4-6 in één keer:**
```sql
SELECT c.ROLE_TYPE_ID, rt.ROLE_TYPE_LABEL, a.ACTOR_ID, a.NAME1, a.ADR1, a.ADR2, a.ADR3, a.ADR4, a.ADR5
FROM CASTING c
LEFT JOIN CASE_ROLE_TYPE rt ON rt.ROLE_TYPE_ID = c.ROLE_TYPE_ID
LEFT JOIN ACTOR a ON a.ACTOR_ID = c.ACTOR_ID
WHERE c.CASE_ID = @case_id AND c.ROLE_TYPE_ID IN (4, 5, 20)
```

## 7. Application Date (uit de diary)

| | |
|---|---|
| **Tabel** | `DIARY_DATE` + lookup `DIARY_FIELD` |
| **Kolom** | `DIARY_FIELD.FIELD_NUMBER = 3` ("Basic Application Date") → `DIARY_DATE.DIARY_DATE` |
| **Let op** | Er bestaan varianten (`8` = National Filing Date, `73` = Parent Application Date, `10125` = Base Application Date) voor cases met een afwijkende dossiergeschiedenis (prioriteit elders, afgesplitst dossier, etc.) — veld 3 is de standaard/eerste-depot-datum. |
| **Voorbeeld** | `TM106410BX00` → 11 maart 2026 |

## 8. Application Number (uit de diary)

| | |
|---|---|
| **Tabel** | `DIARY_TEXT` (het tekst-equivalent van `DIARY_DATE` — data-type per veld bepaalt of het in `DIARY_DATE` of `DIARY_TEXT` staat) + `DIARY_FIELD` |
| **Kolom** | `DIARY_FIELD.FIELD_NUMBER = 4` ("Basic Application No.") → `DIARY_TEXT.DIARY_TEXT` |
| **Voorbeeld** | `TM106410BX00` → `1544285` |

## 9. Publication Date (uit de diary)

| | |
|---|---|
| **Tabel** | `DIARY_DATE` + `DIARY_FIELD` |
| **Kolom** | `DIARY_FIELD.FIELD_NUMBER = 11` ("Publication Date") |
| **Voorbeeld** | `TM106410BX00` → 16 maart 2026 |

## 10. Registration Date (uit de diary)

| | |
|---|---|
| **Tabel** | `DIARY_DATE` + `DIARY_FIELD` |
| **Kolom** | `DIARY_FIELD.FIELD_NUMBER = 35` ("Patent/Registration Date") |
| **Let op** | Ook hier landspecifieke varianten (bv. `20107` South Korea, `20108` Australia, `20176` Canada) voor cases waar dat relevant is — veld 35 is de generieke/hoofddatum. |

## 11. Registration Number (uit de diary)

| | |
|---|---|
| **Tabel** | `DIARY_TEXT` + `DIARY_FIELD` |
| **Kolom** | `DIARY_FIELD.FIELD_NUMBER = 37` ("Registration No.") → `DIARY_TEXT.DIARY_TEXT` |
| **Let op** | Alleen gevuld zodra het dossier daadwerkelijk geregistreerd is — leeg bij dossiers die nog in behandeling/gepubliceerd zijn (zoals `TM106410BX00` op moment van schrijven). |

## 12. Logo (als er sprake is van een logo)

| | |
|---|---|
| **Tabel** | `PAT_CASE_PICTURE` (kan meerdere per dossier bevatten) + `PAT_CASE.CASE_PICTURE_PATH` (enkelvoudige verwijzing op het dossier zelf) |
| **Kolom** | `PAT_CASE_PICTURE.CASE_PICTURE_PATH` / `PICTURE_NAME`, `IS_HEAD_PICTURE` (hoofdplaatje), `WIDTH_L/HEIGHT_L` |
| **Belangrijke nuance** | De database bevat alleen een **bestandsnaam/pad** (bv. `Tripper logo-paars.jpg`), **geen binaire beeldgegevens**. Het daadwerkelijke plaatje staat vermoedelijk op een bestandsshare/documentbeheersysteem dat we nog niet hebben gelokaliseerd (`PAT_ALFRESCO_DOCUMENT_LOG` bestaat wel als tabel maar is leeg — dus niet via Alfresco). **Openstaand punt**: uitzoeken waar deze bestanden fysiek staan voordat een systeem het logo daadwerkelijk kan tonen/downloaden. |

## 13. Classes

| | |
|---|---|
| **Tabel** | `TRADE_MARK_CLASS` |
| **Kolom** | `TRADE_MARK_CLASS` (nvarchar(10), bv. "09", "16") |
| **Join** | `CASE_ID = <case_id> AND LANGUAGE_ID = 3` (Engels; andere taal-ID's mogelijk voor andere talen) |
| **Voorbeeld** | `TM106410BX00` → klassen 09 en 16 |

## 14. Classes Specification

| | |
|---|---|
| **Tabel** | zelfde tabel als Classes: `TRADE_MARK_CLASS` |
| **Kolom** | `GOODS_TEXT` (nvarchar(MAX)) — de volledige waren/diensten-omschrijving per klasse |
| **Let op** | Er bestaat ook een tabel `TM_SPEC` (SERIAL + CLASS + INDICATION) — dat is een generieke indicatiebibliotheek, niet per-dossier gekoppeld op `CASE_ID`. Voor per-dossier specificatietekst is `TRADE_MARK_CLASS.GOODS_TEXT` de juiste bron. Voor multi-jurisdictie dossiers (IR/Madrid) kan `TRADE_MARK_CLASS_DESIGNATION` afwijkende tekst per designated state bevatten. |
| **Voorbeeld** | Klasse 09: *"Recorded and downloadable media; Blank digital or analogue recording and storage media; ..."* |

## 15. Documents (uit de Documents-tab)

| | |
|---|---|
| **Tabel** | `PAT_DOC_LOG` |
| **Kolommen** | `DOC_NAME` (korte naam, bv. "aan client"/"van client"), `DOC_FILE_NAME` (bestandsnaam), `LOG_DATE`, `DOC_SENT_DATE`, `DOC_REC_DATE`, `DOC_TYPE`, `CATEGORY_ID`, `EMAIL_SENT_TO`/`EMAIL_SUBJECT` (bij verzonden e-mails) |
| **Join** | `CASE_ID = <case_id>`, sorteer op `LOG_DATE DESC` |
| **Let op** | Net als bij Logo: dit is **metadata over** het document (naam, datum, wie), niet de bestandsinhoud zelf. Waar de bestanden fysiek staan is nog niet uitgezocht — zelfde openstaand punt. |
| **Omvang** | ~5 miljoen rijen totaal in de hele database — bij een lookup altijd filteren op `CASE_ID`, nooit ongefilterd bevragen. |

## 16. Actions (uit de workflows/Action-tab)

| | |
|---|---|
| **Tabellen** | `EVENT` (het per-dossier voorkomen) + `EVENT_SCHEME` (definieert het actietype) + `EVENT_SCHEME_TEXT` (het leesbare label, per taal) |
| **Join** | `EVENT.CASE_ID = <case_id>` → `EVENT.EVENT_SCHEME_ID = EVENT_SCHEME.EVENT_SCHEME_ID` → `EVENT_SCHEME.EVENT_SCHEME_TEXT_ID = EVENT_SCHEME_TEXT.EVENT_SCHEME_TEXT_ID AND EVENT_SCHEME_TEXT.LANGUAGE_ID = 3` |
| **Kolommen** | `EVENT.OPEN_DATE`, `DONE_DATE` (leeg = nog open), `RESP_LOGIN_ID` (verantwoordelijke medewerker, initialen) |
| **Voorbeeld** | `TM106410BX00` → o.a. *"(instruct agent to) file observations"* (open, `EH`), *"deadline refusal"* (open, `EH`), *"send reminder to client"* (afgerond), *"no further action"* (afgerond) |

**Query:**
```sql
SELECT e.EVENT_SCHEME_ID, est.EVENT_SCHEME_TEXT AS actie_label, e.OPEN_DATE, e.DONE_DATE, e.RESP_LOGIN_ID
FROM EVENT e
LEFT JOIN EVENT_SCHEME es ON es.EVENT_SCHEME_ID = e.EVENT_SCHEME_ID
LEFT JOIN EVENT_SCHEME_TEXT est ON est.EVENT_SCHEME_TEXT_ID = es.EVENT_SCHEME_TEXT_ID AND est.LANGUAGE_ID = 3
WHERE e.CASE_ID = @case_id
ORDER BY e.OPEN_DATE DESC
```

---

## Openstaande punten

1. **Logo- en documentbestanden** (§12, §15): de database bevat alleen bestandsnamen/paden, geen binaire inhoud. Fysieke opslaglocatie (bestandsshare? ander documentbeheersysteem?) nog niet gevonden.
   **Onderzocht (2026-09-03) en niet gevonden**: een submap-nummering per dossiertype (bv. "TM12345" met submap "9" voor TM-documenten, "4" voor D-documenten) is niet terug te vinden in de database zelf. Gecheckt en uitgesloten:
   - `CASE_TYPE_DEFINITION.CASE_MASTER_ID` / `CASE_MASTER` — geeft TM=4, D=3 (komt niet overeen met de genoemde 9/4).
   - `PAT_DOC_LOG.DOC_TYPE` en `.CATEGORY_ID` per dossiertype — verdeling overlapt sterk tussen TM- en D-dossiers, geen 1-op-1 patroon.
   - `PAT_DOC_CLASSIFICATION`, `PAT_DOWNLOAD_CASE_AREA`, `PAT_CASE_LOCATION_DEF`, `PAT_CONTAINER_TYPE`, `PAT_DOC_DOCKETING_CONTAINER`, `PAT_DOCKETING_CONFIG` — geen van allen bevat een dossiertype-naar-submapnummer-mapping.
   - `PAT_CASE.CASE_LOCATION`/`CASE_LOCATION_NEW` en `PAT_CASE_LOCATION` — bevatten alleen fysieke archiefstatus ("Other location", "in archive"), geen padstructuur.
   - `DOC_FILE_NAME`/`CASE_PICTURE_PATH` zelf zijn kale bestandsnamen zonder mapstructuur.

   **Conclusie**: deze nummering (als hij bestaat) leeft vermoedelijk buiten deze SQL-database — op het bestandsshare/documentbeheersysteem zelf, of hardcoded in de Patricia-cliënt/NXT-configuratie. Vanuit een read-only SQL-verbinding is dit niet te achterhalen; dit moet uitgezocht worden bij IT of via iemand die de Patricia-cliënt zelf bedient (bv. rechtermuisklik "open dossiermap" en de padstructuur aflezen).
2. **Netwerktoegang vanaf Chronos/KIP/OTMIS**: deze database is alleen bereikbaar vanaf het Knijff-netwerk. Voor een live koppeling vanuit een extern gehost systeem (zoals Chronos op Vercel) is een VPN-tunnel of gateway nodig — met IT af te stemmen.
3. **"Case Responsible" team** (niet in deze lijst gevraagd, maar eerder tegengekomen): geen vast veld op dossierniveau — `CASE_TEAM` is nagenoeg leeg (3 rijen firmbreed). Verantwoordelijkheid blijkt per open actie (`EVENT.RESP_LOGIN_ID`) bijgehouden te worden, niet als vast dossierveld.
