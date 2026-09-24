# Facturatie-export naar AccountView — veldmapping en inventarisatie

*Status: onderzoek/inventarisatie, geen implementatie. 2026-09-24.*

Aanvulling op [`plan-facturatie-vanuit-chronos.md`](plan-facturatie-vanuit-chronos.md) §7
(AccountView), op basis van drie echte exportbestanden die IT vandaag al gebruikt
(`20260923120002_Debiteuren.csv`, `20260923120002_Projecten.csv`,
`20260923120002_FactuurRegels.csv`) plus toelichting van de DBA/applicatiebeheerder.

**Belangrijke voorbehoud vooraf**: deze drie bestanden voeden vandaag het **centraal
factureren van jaarlijkse merkbewakings-/verlengingsfacturen** — een bestaand,
terugkerend proces, los van Chronos. Niet bevestigd is of ad-hoc, per-dossier
Chronos-facturatie exact dezelfde bestandsvorm zou gebruiken. Het is wel het enige
concrete precedent dat we hebben van hoe AccountView data binnenkrijgt, en de
veldmapping hieronder is hoe dan ook nuttig: als Chronos straks zelf exporteert, is dit
de vorm om naar te bouwen, of op zijn minst het uitgangspunt om met de DBA te bespreken.

## 1. Grootste conclusie: AccountView-import is bestandsgebaseerd, niet (per se) een API

De bestandsnamen delen een datum/tijd-prefix (`20260923120002` = 2026-09-23, 12:00:02) —
drie samenhangende bestanden per exportmoment, kennelijk (handmatig of gepland)
gegenereerd en vervolgens in AccountView geïmporteerd. Dit is een **bewezen, in
productie gebruikt** integratiepad. Dat verandert het advies uit het hoofdplan (§7):
in plaats van "CSV als voorlopige eerste versie, API onduidelijk", is de volgorde nu
eerder **"bouw naar dit bewezen CSV-formaat toe; onderzoek een API alleen als IT
bevestigt dat die bestaat én er een concrete reden is (realtime) om het bewezen pad
niet te gebruiken."** Zie §6.

## 2. De drie bestanden en hun rol

| Bestand | Rol |
|---|---|
| `Debiteuren.csv` | Debiteurstamgegevens (naam, adres, contact, BTW, valuta, team) |
| `Projecten.csv` | Groepering per "project" — komt inhoudelijk overeen met een dossier/merk, met een eigen AccountView-projectnummer (`proj_code`) |
| `FactuurRegels.csv` | De eigenlijke factuurregels, elk gekoppeld aan een debiteur (`rpl_del`) en een project (`proj_code`) |

## 3. Veldmapping — `Debiteuren.csv`

| AccountView-veld | Betekenis | Chronos-equivalent vandaag | Gat / actie |
|---|---|---|---|
| `sub_nr` | Debiteurnummer | `klanten.accountview_debiteurnummer` (bestaat, leeg, ongebruikt) | Geen — dit is precies waarvoor dat veld al klaarstaat. |
| `src_code` | Zoekcode, `ucase(left(bedrijfsnaam,10))` | — | Puur afgeleid, geen los veld nodig — Chronos kan dit berekenen uit `klanten.naam` op exportmoment. |
| `acct_name` | Bedrijfsnaam | `klanten.naam` / `klanten.juridische_naam` | Te bepalen welke van de twee. |
| `admin_name` | Contactpersoon | **Geen veld.** | Nieuw: contactpersoon per klant bestaat nergens in Chronos. |
| `addr_line1`/`addr_line2` | Adresregels | `klanten.adres` (één vrij tekstveld) | **Gat.** Adres moet gesplitst worden in regels — vandaag ongestructureerd. |
| `post_code`/`city` | Postcode/plaats | **Geen apart veld** (zit, als het er al in staat, in de vrije `adres`-tekst) | **Gat.** Nieuwe gestructureerde velden nodig. |
| `cnt_code`/`country` | ISO-landcode / landnaam **in de taal van de billing** | **Geen apart klant-landveld** — Chronos leidt land vandaag alleen af per dossier (uit het dossiernummer, via `landcodes`), niet per klant/billing-adres | **Gat.** Nieuw klant-niveau landveld nodig; de taalgevoelige naamweergave kan mogelijk hergebruikt worden (`landNaamVoorIso()` bestaat al voor dossierland). |
| `po_box`/`po_city` | Postbus | — | Waarschijnlijk lage prioriteit (edge case); niet blind toevoegen zonder te checken of dit voor Knijff-klanten voorkomt. |
| `tel_bus`/`tel_mob` | Telefoon | **Geen veld.** | Nieuw, lage prioriteit voor facturatie zelf. |
| `mail_bus` | E-mailadres | **Geen veld op `klanten`.** | **Belangrijk gat** — nodig voor zowel deze export als het versturen van de factuur/specificatie per mail (hoofdplan §6). Nu al te bouwen, ongeacht wanneer de AccountView-export volgt. |
| `www_url` | Website | — | Niet relevant voor facturatie. |
| `coc_code` | KvK-nummer (aanname) | — | Staat leeg in de sample — bevestigen of dit ooit gevuld wordt. |
| `lng_code` | *Volgens DBA-notitie: taalcode* | `klanten.specificatietaal` (bestaat al) | **Let op — verifiëren, niet aannemen.** Sample-waarde is `"KNSTD"` voor een Nederlandse klant, wat geen taalcode-formaat is. Mogelijk is dit iets anders (bv. een sjabloon-/tariefgroepcode). Navragen bij de DBA voordat hier een mapping op gebouwd wordt. |
| `vat_code` | BTW-**code** (niet het percentage) | **Geen equivalent** — Chronos heeft alleen `klanten.btw_percentage`/`btw_vermelding` (vrije tekst) | **Gat.** Dit is een AccountView-interne regimecode (sample: `"1"`). Het BTW-plan (hoofdplan §4) bepaalt zelf een regime (NL/EU/verlegd/buiten-EU) — dat resultaat moet mappen op AccountView's eigen codetabel. **Die codetabel moet bij IT/de DBA opgevraagd worden.** |
| `vat_nr` | BTW-nummer van de klant | **Geen veld.** | Nieuw — nodig sowieso voor verlegde BTW binnen de EU (geldig BTW-nummer controleren/vastleggen). |
| `cur_code` | Valuta | `klanten.valuta` (bestaat al) | Geen gat. |
| `emp_nr` | Teamcode (2 letters, bv. `AB`, `FM`; DBA-notitie: "ERS = ES") | `teams`/`team_members`, maar met interne (Chronos-)namen/id's, geen 2-letterige AccountView-code | **Gat.** Nieuwe mapping-tabel Chronos-team → AccountView-teamcode nodig — DBA's voorbeeld "ERS = ES" laat al zien dat dit geen simpele afkorting-op-naam is. |

## 4. Veldmapping — `Projecten.csv`

| AccountView-veld | Betekenis | Chronos-equivalent vandaag | Gat / actie |
|---|---|---|---|
| `proj_code` | AccountView-projectnummer (sample: `4877434369`, `4880963085`, `5168394071`) | **Geen equivalent.** | Dit is **niet** het Knijff-dossiernummer (zie §3 hieronder) — een los, AccountView-eigen nummer. Als Chronos dit zelf gaat uitgeven, is een nieuwe koppeltabel dossier↔proj_code nodig; als AccountView dit zelf toekent, moet Chronos het terugkrijgen/opslaan. |
| `proj_desc` | Projectomschrijving (sample: "REPARAAD in de Benelux", "THE MAINTENANCE COMPANY logo in de Benelux") | Lijkt qua functie op `factuuritem_dossiers.matter_naam` (het merk/de dossiernaam) | Geen nieuw veld nodig qua concept — wel een samenstelfunctie ("{merk} in de {regio/land}") om te definiëren. |
| `emp_nr` | Teamcode | Zie §3 (`emp_nr`) | Zelfde gat/mapping als hierboven. |
| `sub_nr` | Debiteurnummer | — | In de sample leeg op projectniveau (koppeling loopt kennelijk via de factuurregel, niet het project) — **navragen bij de DBA of dit klopt of dat hier soms wél een waarde hoort te staan.** |

**Cruciale observatie**: het echte Knijff-dossiernummer (bv. `TM107079BX00`) komt in
deze drie bestanden **nergens als apart, gestructureerd veld voor** — het staat alleen
als vrije tekst, tussen vierkante haken, in de regelomschrijving van `FactuurRegels.csv`
(zie §5, `art_desc1`). `proj_code` is dus een **AccountView-eigen** projectnummer, geen
Chronos-dossiernummer. Als Chronos zelf dit soort exports gaat genereren, moet ergens
een koppeling dossier ↔ AccountView-`proj_code` vastgelegd worden — die bestaat vandaag
niet.

## 5. Veldmapping — `FactuurRegels.csv`

| AccountView-veld | Betekenis | Chronos-equivalent vandaag | Gat / actie |
|---|---|---|---|
| `soi_hdr.rpl_del` | Debiteurnummer | `klanten.accountview_debiteurnummer` | Geen gat. |
| `soi_hdr.cost_code` | Kostenplaats, `"K" + teamcode` (sample: `KFM`, `KAB`) | — | Afgeleid uit de teamcode-mapping (§3) plus een vaste `"K"`-prefix. |
| `soi_hdr.proj_code` | AccountView-projectnummer | Zie §4. | Zie §4. |
| `soi_hdr.comment1` | Orderreferentie (sample: "Uw opdracht van 09-22-2026", of het merk zelf) | **Geen equivalent.** | **Gat.** Nieuw vrij invoerbaar veld nodig, per specificatie/factuurbatch — geen bestaand Chronos-veld leent zich hiervoor (`klanten.opmerkingen` is klant-niveau, niet per batch). |
| `soi_line.art_code` | Artikelcode (sample: `4060`, `7000`, `1001`, `0001`, `0080`, of leeg) | **Geen productcatalogus in Chronos.** | **Grootste gat, en het belangrijkste inzicht van dit onderzoek.** Chronos factureert vandaag met vrije tekst + tarief, geen artikelcodes. Dit valt **direct samen met het al genoteerde backlog-item "Standaardproducten"** (`backlog.md`, 2026-09-02) — dat was tot nu toe een UX-wens ("niet steeds opnieuw intypen"), maar is hiermee ook een **harde randvoorwaarde** voor een AccountView-export: elke regel die als "artikel" geboekt wordt, moet een geldige AccountView-artikelcode hebben. Openstaande vraag: is er ook een generieke artikelcode voor **uurwerk** (het merendeel van het dagelijkse tijdschrijven), of geldt dit alleen voor vaste-prijs-diensten (aanvraag/verlenging/bewaking)? Navragen bij de DBA. |
| `soi_line.tinv_qty` | Aantal (4 decimalen, bv. `1.0000`) | `factuuritems.qty` | Controleren of Chronos' huidige precisie hiermee overeenkomt. |
| `soi_line.art_desc1` | Omschrijving factuurregel — bevat soms het dossiernummer tussen `[...]` (bv. "Merkregistratie - Benelux [TM107079BX00]") | `factuuritems.omschrijving_klant` | Samengestelde tekst, geen 1-op-1-veld — exportlogica moet dossiernummer erin verwerken zoals het huidige proces al doet. Sommige regels zijn puur decoratief (lege `art_code`, bedrag 0) — kennelijk een "kopje" boven de echte artikelregel; functioneel niet noodzakelijk voor een correcte boeking, wel voor dezelfde lay-out als vandaag. |
| `soi_line.art_px` | Verkoopprijs per eenheid | `factuuritems.tarief` (of vaste prijs bij een standaardproduct) | Qua model compatibel (aantal × prijs), geen structureel gat. |
| `soi_line.rec_ord` | Regelvolgorde (sample: `101001`, `101011`, `201000`, `201001`, `201011`, `301021`, ...) | — | **Patroon (hypothese, niet bevestigd):** honderdtallen lijken een groep per project/dossier te markeren (101, 201, 301, ...), en het laatste cijfer een positie binnen die groep (kopje op `...001`, eerste artikelregel op `...011`, tweede op `...021`). **Dit moet bij de DBA bevestigd worden voordat Chronos zelf nummers genereert** — een verkeerde aanname hier riskeert een verminkte factuurlay-out in AccountView. |
| `soi_hdr.u_acctcost` | Initialen van de gebruiker (sample: `AG`) | `factuuritems.medewerker_id` (uuid, geen initialen) | **Gat.** Nieuwe koppeling nodig: gebruiker → 2-letterige AccountView-initialen (analoog aan de teamcode-mapping in §3). |

## 6. Belangrijkste gaten, samengevat en geprioriteerd

1. **Productcatalogus / artikelcodes** — valt samen met het bestaande backlog-item
   "Standaardproducten"; nu bevestigd als harde noodzaak, niet alleen UX-comfort.
2. **Team → AccountView-teamcode-mapping** (en de afgeleide `cost_code`/`emp_nr`).
3. **Gebruiker → AccountView-initialen-mapping.**
4. **Klantadres is vandaag ongestructureerd** (`klanten.adres` één vrij veld) —
   moet gesplitst worden in straat/postcode/plaats/land om als debiteurstamdata te
   kunnen exporteren.
5. **Geen e-mailveld op `klanten`** — nodig voor deze export én (los daarvan, sowieso)
   voor het versturen van facturen/specificaties per mail.
6. **`lng_code`-waarde klopt niet met de aanname "taalcode"** — verifiëren voordat
   `klanten.specificatietaal` hierop gemapt wordt.
7. **`vat_code` is een AccountView-interne regimecode**, geen percentage — de
   codetabel moet bij IT/de DBA opgevraagd worden om het BTW-plan (hoofdplan §4) op te
   mappen.
8. **Orderreferentie (`comment1`)** — nieuw, vrij invoerbaar veld nodig per
   specificatie/factuurbatch.
9. **AccountView-projectnummer (`proj_code`) ≠ Knijff-dossiernummer** — een nieuwe
   koppeling dossier ↔ `proj_code` is nodig zodra Chronos zelf dit soort regels gaat
   genereren.
10. **`rec_ord`-volgordelogica** — patroon is een hypothese, moet bevestigd worden.

## 7. Open vraag: maakt Chronos ook nieuwe debiteuren aan, of alleen verwijzen?

`klanten.accountview_debiteurnummer` bestaat vandaag als een leeg veld dat kennelijk
bedoeld is om een **al bestaand** AccountView-debiteurnummer aan een klant te koppelen
(handmatig ingevuld door een beheerder). De rijke structuur van `Debiteuren.csv` (adres,
contactpersoon, BTW-nummer, taal, valuta) roept de vraag op of Chronos in de toekomst
zelf **nieuwe** debiteuren in AccountView zou moeten kunnen aanmaken via dezelfde
bestandsvorm, in plaats van dat finance/IT dat altijd eerst handmatig in AccountView
doet. Dit is een bewuste keuze om te maken, geen technisch gegeven — beide kanten hebben
consequenties (zelf aanmaken = meer velden op `klanten` nodig, mogelijk dubbele
invoer-risico's; alleen verwijzen = eenvoudiger, maar betekent dat een nieuwe klant in
Chronos altijd eerst via IT/finance in AccountView moet bestaan voordat er gefactureerd
kan worden).

## 8. Live API vs. dit CSV-pad — aangescherpt advies

Nu we weten dat een bestandsgebaseerde import vandaag al in productie draait, is het
praktische advies: **bouw de Chronos-export naar dit bewezen formaat toe**, en behandel
een eventuele live API als een latere, apart te onderzoeken vraag — niet als iets waar
dit plan op moet wachten. Blijft open (ongewijzigd t.o.v. het hoofdplan): of AccountView
daarnaast ook een API heeft, en of deze import vandaag handmatig getriggerd wordt of
al via een schema draait — zie de vragen in §9.

## 9. Concrete vervolgvragen voor de DBA/applicatiebeheerder

- Is er een (of meerdere) artikelcode(s) voor **uurwerk**, of dekken artikelcodes
  alleen vaste-prijs-diensten (aanvraag/verlenging/bewaking)?
- Wat is de volledige teamcode-tabel (alle teams, niet alleen de twee/drie uit deze
  sample)?
- Wat is de volledige gebruiker-naar-initialen-tabel?
- Wat is de volledige `vat_code`-tabel (welke code hoort bij welk BTW-regime)?
- Betekent `lng_code` echt een taalcode? Wat verklaart de waarde `"KNSTD"`?
- Klopt de `rec_ord`-hypothese uit §5, en zijn de "kopje"-regels (lege artikelcode,
  bedrag 0) functioneel nodig of puur cosmetisch?
- Wordt deze import vandaag **handmatig** in AccountView ingelezen, of loopt dit al via
  een vaste procedure/schema? (Bepaalt of "cron/automatisch" voor Chronos's export
  realistisch is, of dat er aan de AccountView-kant ook iets moet veranderen.)
- Heeft AccountView, los van dit importpad, ook een bruikbare API?
- Accepteert AccountView naast (of in plaats van) CSV ook een JSON-bestand voor
  import? (Vraag die apart is opgekomen — nog niet bevestigd of dit een reëel
  alternatief is voor het bestaande CSV-pad.)
- Mag Chronos ooit een geheel **nieuwe** debiteur aanmaken via deze weg, of moet dat
  altijd eerst handmatig in AccountView gebeuren (zie §7)?
