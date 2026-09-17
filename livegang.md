# Livegang: van één omgeving naar LIVE / BETA / TEST

Plan van aanpak om Chronos uit te breiden van één (productie-)omgeving naar drie:
een stabiele LIVE-omgeving voor Knijff, een BETA-omgeving voor een gecontroleerde
test met echte gebruikers, en een TEST-omgeving voor development zonder risico.

Uitgangspunten (besloten):
- BETA werkt met eigen data, los van productie — geen kopie van echte cliëntgegevens.
- HubSpot-integratie is read-only (alleen zoeken/ophalen, nooit schrijven) — dezelfde
  token kan dus gewoon door alle drie de omgevingen gebruikt worden; geen sandbox nodig.
- Backups en monitoring horen bij deze livegang, niet bij een latere fase.

## Status (bijgewerkt 2026-09-02)

Stappen 1 t/m 5 zijn uitgevoerd:

- ✅ **Stap 1**: `vercel-build` gebruikt nu `SUPABASE_PROJECT_REF` (met de bestaande
  productie-ref als default) i.p.v. een hardcoded waarde. Geverifieerd: LIVE-deploys
  blijven werken.
- ✅ **Stap 2**: nieuw Supabase-project **"Chronos Beta"** aangemaakt (regio eu-north-1,
  org `wdfiivdxprswjfrxcmqr`, ref `rmccpxyuuocjxwyxoyvd`).
- ✅ **Stap 3**: volledige migratiehistorie toegepast op Chronos Beta, via een deploy op
  de nieuwe `beta`-branch (Vercel's build-omgeving kon de Postgres-pooler wél
  betrouwbaar bereiken — vanaf deze machine gaf zowel `supabase db push` als
  `migration repair` rechtstreeks een TLS-verbindingsfout, ongeacht wachtwoord/ref;
  hetzelfde patroon als eerder bij productie). Onderweg de eenmalige
  Espero/KNVB-opschoningsmigratie aangepast zodat hij op een lege database een
  onschuldige no-op is in plaats van hard te falen (zie de aparte commit daarvoor).
- ✅ **Stap 4**: bestaande `scripts/seed.mjs` gedraaid tegen Chronos Beta (basisset:
  7 demo-gebruikers, 2 teams, 2 klanten, 10 factuuritems, 3 specificaties). De
  rijkere/realistischere BETA-specifieke uitbreiding (zie §4 hieronder) is nog niet
  gedaan — dit is de bestaande lokale demoset, één-op-één overgezet.
- ✅ **Stap 5**: branch `beta` aangemaakt en gepusht; branch-gebonden environment
  variables ingesteld in Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
  `SUPABASE_DB_PASSWORD`), gescopeerd op de `beta`-branch specifiek. Stabiele,
  automatisch-bijwerkende URL: **https://chronos-git-beta-erwin-hauers-projects.vercel.app**
  (elke push naar `beta` deployt hier opnieuw naartoe, zonder handmatige stappen).

- ✅ **Stap 6 (Deployment Protection)**: Password Protection bleek een betaalde
  Vercel-add-on ("Advanced Deployment Protection") te vereisen, die dit team niet
  heeft. Op jouw keuze is de standaard Vercel-login-vereiste (SSO Protection) daarom
  uitgezet voor preview-deploys — de beta-URL is nu rechtstreeks bereikbaar, maar
  blijft wel achter Chronos' eigen magic-link-inlog zitten (niemand komt zonder
  geldig account bij data).
- ✅ **Stap 7 (backups)**: al geverifieerd zonder verdere actie — beide projecten
  hebben standaard dagelijkse fysieke backups aan staan (`walg_enabled: true`).
  Point-in-time recovery staat bij geen van beide aan; dat is een betaalde upgrade,
  alleen nodig als je preciezer dan "terug naar gisteren" wilt kunnen herstellen. Een
  proefherstel is nog niet gedaan — dat raakt een bestaand project, dus alleen op
  jouw verzoek.
- ⏭️ **Stap 8 (foutregistratie)**: overgeslagen op jouw verzoek. Vercel's eigen logs
  blijven wel gewoon beschikbaar. Kan later alsnog, zodra je een Sentry-account (of
  vergelijkbaar) + DSN hebt.
- 🔄 **Stap 9 (betatesters) — gestart.** Eerste (en vooralsnog enige) gebruiker in
  Chronos Beta: **Erwin Haüer, erwin@knijff.com, rol beheerder**. Inloggen gaat via
  Chronos' eigen magic-link (geen wachtwoordveld in de app-UI — een wachtwoord is wel
  op het account gezet zoals gevraagd, maar heeft geen effect zolang de app alleen
  magic-link aanbiedt). Verdere testers: zodra er een lijst is, zet ik ze op dezelfde
  manier neer — met hun eigen, echte e-mailadres (zie de opmerking hierboven over
  `@chronos.local` die niet afleverbaar is).

## 0. Werkwijze vanaf nu (afgesproken 2026-09-02)

Nieuwe wijzigingen gaan niet meer standaard rechtstreeks naar `main`/LIVE:

- **Kleine/simpele wijzigingen**: direct committen en pushen naar `beta` — deploy't
  automatisch naar de BETA-URL om uit te proberen.
- **Grotere/nieuwe features**: eerst een aparte featurebranch voorstellen (niet
  meteen op `beta` zelf werken), zodat BETA intussen stabiel/bruikbaar blijft. Die
  branch wordt pas in `beta` gemerged zodra hij klaar is om getest te worden.
- **Promotie naar `main` (LIVE)**: pas nadat het op BETA is getest en expliciet is
  goedgekeurd — nooit automatisch. Zie §3 voor het exacte git-commando's-voorbeeld.

### BETA-wachtrij (staat op BETA, nog niet gepromoot naar LIVE)

Deze lijst houd ik bij zodra ik iets naar `beta` push (toevoegen) en werk ik bij
zodra `beta` naar `main` wordt gepromoot (verwijderen). Controleren of deze lijst
nog klopt met de werkelijkheid kan altijd met `git log origin/main..origin/beta`.

*Bijgewerkt 2026-09-15.* In-app Handleiding en Klanten-overzicht zijn beide
gepromoot naar `main`/LIVE op 2026-09-02 (na testen op BETA en expliciet
akkoord). Daarna is de Handleiding verplaatst naar de zijbalk (boven "Profiel")
en herontworpen met echte componenten (commit `7aaa3b1`) — ook getest op BETA
en na akkoord gepromoot naar `main`/LIVE op 2026-09-02. Daarna is de fix voor
het lege Medewerker-badge (commit `e440fc1`) getest op BETA en na akkoord
gepromoot naar `main`/LIVE op 2026-09-03. Daarna is de dashboard-tegel "Nog te
factureren werk van het team" uitgebreid met een uitsplitsing per teamlid
(teamleider eerst, dan alfabetisch — commit `e00da57`) — ook getest op BETA en
na akkoord gepromoot naar `main`/LIVE op 2026-09-04. Daarna is het
Medewerker-veld bij "Factuuritems > Nieuw" altijd zichtbaar gemaakt (default
de ingelogde gebruiker, wijzigbaar naar een teamgenoot voor teamleider/
beheerder — commit `1882717`) — lokaal getest en op verzoek direct naar
zowel `beta` als `main`/LIVE gepromoot op 2026-09-07. Daarna is de fix voor het
niet kunnen verwijderen van een teamgenoot's niet-gefactureerd factuuritem
door een teamleider (migratie `20260907120000_factuuritem_delete_teamleider.sql`,
commit `3db1747`) getest op BETA en gepromoot naar `main`/LIVE op 2026-09-07 —
inclusief handmatige correctie van het al geraakte Augusta Benelux B.V.-item.
Daarna is een negatief bedrag op een factuuritem toegestaan, om deels te
crediteren (tarief mag nu negatief; korting-check aangepast via migratie
`20260908110000_factuuritem_negatief_bedrag.sql`, commit `60b31cd`) — lokaal
end-to-end getest, gepusht naar `beta` en daar schoon gedeployed op
2026-09-08. Daarna is de fix voor admin-gegenereerde magiclinks (o.a. een
handmatige inloglink) die altijd op "/login?fout=verlopen" uitkwamen —
nieuwe `/auth/confirm`-route, commit `c0b04fa` — getest op BETA en gepromoot
naar `main`/LIVE op 2026-09-08. Daarna is ook de negatief-bedrag-feature
zelf getest op BETA en na akkoord gepromoot naar `main`/LIVE op 2026-09-08.
Daarna is de fix voor het bij "Factuuritems > Nieuw" gekozen teamlid dat
altijd op de aanmaker terechtkwam (zowel een app-bug in `createFactuurItem`
als een ontbrekende RLS insert-policy voor teamleider/beheerder, migratie
`20260908130000_factuuritem_insert_teamleider_beheerder.sql`, commit
`d55f9af`) getest op BETA en gepromoot naar `main`/LIVE op 2026-09-08.
Daarna is een project na aanmaken ook wijzigbaar (projectnaam, PO-nummer,
omschrijving — commit `5e0a932`) en archiveerbaar gemaakt (verdwijnt uit de
keuzelijst voor nieuwe factuuritems, bestaande items blijven ongewijzigd —
geen echte delete i.v.m. de FK vanuit factuuritems/facturatiebatches, commit
`e4a1ba7`) — lokaal end-to-end getest en gepromoot naar `main`/LIVE op
2026-09-09. Daarna een batch kleinere optimalisaties: rol "Teamleider" overal
hernoemd naar "Praktijkvoerder" (weergavetekst, interne rol-key ongewijzigd),
groeperen op dossier (als schakelaar naast groeperen op project), zoeken op
dossiernaam, land-tags allemaal dezelfde kleur / medewerker-badges juist per
persoon een eigen kleur, een "B"-badge bij bureaukosten, uitklapbare
meerdere-dossiers-op-één-regel, en het "Overzicht regel"-paneel in het
factuuritem-formulier in de sidebarkleur (commits `c1d792b`, `496ef93`,
`da4063f`) — lokaal getest en gepromoot naar `main`/LIVE op 2026-09-09.
Daarna een fix voor medewerker-badges die soms dezelfde kleur kregen (een
hash naar maar 5 kleuren botste met 8 actieve medewerkers) — nu gegarandeerd
een eigen kleur per persoon, gelijk verdeeld over alle actieve medewerkers
(commit `d5fb868`) — direct getest en gepromoot naar `main`/LIVE op
2026-09-09. Daarna, tijdelijk terug naar e-mail+wachtwoord-login i.p.v.
magic link (Supabase's mail-limiet zou de teamtest anders in de weg zitten)
— nieuwe/bestaande gebruikers krijgen het standaardwachtwoord `Chronos2026!`
en moeten dat bij de eerste keer inloggen zelf vervangen (met live
validatie: 8-25 tekens, hoofdletter, cijfer, speciaal teken); `stuurMagicLink`
blijft in de code staan voor als we hierop terugkomen (commit `bf04925`) —
lokaal en op BETA end-to-end getest en gepromoot naar `main`/LIVE op
2026-09-11. Bij deze promotie zijn ook alle bestaande echte accounts op
BETA (5) en LIVE (13, de eerste lichting Knijff-medewerkers) direct
teruggezet op dit standaardwachtwoord + de verplichte-reset-vlag, anders
zou niemand meer kunnen inloggen zodra magic link uit de UI verdween.
Daarna een productiefix: een teamleider/beheerder die bij "Factuuritems >
Nieuw" een nieuw item voor een teamgenoot aanmaakte kreeg soms de
misleidende foutmelding "al definitief/gefactureerd" — de teamcheck in
`createFactuurItem` toetste per ongeluk tegen de aanmaker in plaats van de
uiteindelijke medewerker (commit `cd13b7a`) — direct gereproduceerd tegen
echte LIVE-data, gefixt en met spoed gepromoot naar `main`/LIVE en `beta`
op 2026-09-11. Daarna een self-service "wachtwoord vergeten"-flow (nieuwe
route `/wachtwoord-vergeten`, gebruikt `resetPasswordForEmail` en de
bestaande `/auth/callback`-route, commit `4f815c5`; de link staat onder
i.p.v. boven het wachtwoordveld, commit `9ccdde7`) — lokaal end-to-end
getest via Mailpit (inclusief het bestaande anti-enumeratiegedrag), en de
Factuuritems-pagina toont voortaan tabs om te filteren per team zodra je
lid bent van meer dan één team (op `team_id`, alleen zichtbaar bij 2+
teamlidmaatschappen — commit `31a2f65`) — lokaal getest met een
multi-team- en een single-team-account. Beide zijn getest en gepromoot
naar `main`/LIVE en `beta` op 2026-09-15. Daarna een productiefix, direct
gemeld vanaf LIVE: een gebruiker zag daar factuuritems van een teamgenoot
die voor een ánder team van die teamgenoot waren aangemaakt — de RLS-check
`shares_team_with` toetste alleen of je íets van een team deelt met de
aanmaker, niet of het item zelf bij dat gedeelde team hoort. Gefixt door
`factuuritems_select_scope` te laten toetsen op het eigen `team_id` van het
item (migratie `20260915100000_factuuritem_select_team_scope.sql`), met
`shares_team_with` alleen nog als fallback voor oude rijen zonder team_id;
het Factuuritems-overzicht scoopt nu ook voor finance/beheerder/directie
altijd tot eigen items + eigen team(s), los van hun bredere RLS-rechten
(commit `dca548d`) — lokaal gereproduceerd en gefixt bevestigd, direct
gepromoot naar `main`/LIVE en `beta` op 2026-09-15. Daarna nog drie kleinere
fixes: (1) een teamleider/beheerder die bij "Factuuritems > Nieuw" voor een
teamgenoot aanmaakte kreeg soms dezelfde misleidende "al definitief/
gefactureerd"-foutmelding — de teamknoppen tonen altijd de EIGEN teams van
de aanmaker, los van welke medewerker gekozen is, dus kon team_id een team
zijn waar de gekozen medewerker geen lid van is. `haalHerToewijsbareMedewerkers`
geeft nu ook de team_ids per medewerker terug; de teamkeuze wordt beperkt tot
en automatisch gecorrigeerd naar de team(s) van de gekozen medewerker; (2)
HubSpot-klantzoeken matcht nu ook op PNN ("Patricia ID") naast naam, voor een
numerieke zoekterm (patriciaid is in HubSpot een number-property, dus een
exacte EQ-match, geen wildcard); (3) landcode K4 (Koerdistan) toegevoegd —
net als WW/WO/EU een pseudo-landcode die Patricia hanteert, geen officiële
ISO 3166-1-code. Alle drie lokaal getest (het teamgenoot-scenario met Tom →
Anna end-to-end, PNN-zoeken met een echte HubSpot-call) en gepusht naar
`beta` op 2026-09-15 — nog niet gepromoot naar `main`/LIVE, wacht op akkoord.
Daarna is bij "Factuuritems > Bewerken" de "Nieuwe klant aanmaken"-knop in
het klant-zoekveld verwijderd: Chronos mag klanten niet zelfstandig aanmaken,
alleen ophalen uit HubSpot (en straks Patricia) — `createKlant` en
`NewKlantDialog` waren daarmee ook nergens anders meer gebruikt en zijn
verwijderd. Op verzoek direct gepromoot naar `main`/LIVE en `beta` op
2026-09-16, samen met de drie eerdere fixes hierboven (die tot dan toe alleen
op `beta` stonden).
`main` en `beta` staan weer gelijk.

Daarna, in één ronde (2026-09-16): (1) Klanten > klantpagina toonde al elke
specificatie met vastleggingsdatum (bestond al, geen wijziging nodig) — de
specificatiepagina zelf kreeg er een "Kopieer dossiernummers"-knop bij, die
alle dossiernummers van die specificatie (gededupliceerd, `; `-gescheiden)
naar het klembord zet, met een fallback (`execCommand`) en foutmelding als de
Clipboard-API niet beschikbaar is; (2) standaard uurtarief (geen specifieke
klant-/medewerkerafspraak) van €250 naar €330 — de oude `tarieven`-rij kreeg
een einddatum, een nieuwe geldt vanaf 16 sept. (bestaande registraties raakt
dit nooit, zie de tabelcomment); (3) changelog (`productchangelog`, via
`scripts/release-changelog.mjs`) stond al drie weken stil op v0.26.0 —
bijgewerkt met één inhaalslag-entry **v1.0.0** ("Bèta-lancering") die alles
sinds 0.26.0 samenvat; `package.json`-versienummer ook naar 1.0.0; (4) nieuw:
Instellingen > Auditlog (alleen beheerder) — leest de al bestaande
`auditlog`-tabel (RLS was al beheerder-only) met een leesbaar per-veld-diff,
60-dagen-retentie via een nieuwe `pg_cron`-job (migratie
`20260916110000_auditlog_retentie_en_opslaggrootte.sql`) en de actuele
opslaggrootte via een nieuwe `auditlog_opslaggrootte()`-functie. Alles lokaal
getest (specificatiepagina, tarief-lookup, auditlog-tab met echte diffs en
opslaggrootte) en gepusht naar `beta` op 2026-09-16 — nog niet gepromoot naar
`main`/LIVE, wacht op akkoord. Daarna, op verzoek (nog steeds 2026-09-16, nog
op `beta`): de "Kopieer dossiernummers"-knop staat nu ook op de klantpagina
zelf, naast elke "Download specificatie (PDF)" — niet alleen op de losse
specificatiepagina. En op de klantpagina staan de definitieve factuuritems
niet meer als losse platte lijst, maar als subitems onder hun eigen
specificatie (in-/uitklapbaar per specificatie, met een aparte val voor het
zeldzame geval dat een definitief item geen specificatie heeft); een nieuw
zoekveld filtert op dossier, dossiernaam, land of omschrijving — bij een
zoekterm klappen alleen de specificaties met een match open, met alleen de
matchende regels. Lokaal getest (uit-/inklappen, zoeken op "frankrijk"
toont precies de juiste specificatie met alleen die regel) en gepusht naar
`beta` op 2026-09-16 — daarna op verzoek gepromoot naar `main`/LIVE, samen
met de wachtrij hierboven, ook op 2026-09-16.
`main` en `beta` staan weer gelijk.

Daarna een gemelde bug vanaf LIVE die achteraf toch gewenst gedrag bleek:
bij "Factuuritems > Nieuw" zag een beheerder in het Medewerker-veld het
hele kantoor i.p.v. alleen de eigen teamgenoten — dit is met spoed
"gefixt" door beheerder dezelfde teamgenoten-scoping als teamleider te
geven, en gepromoot naar `main`/LIVE en `beta`. Erwin gaf vrijwel meteen
aan dat dit een verkeerde melding was (hij had zelf verkeerd gekeken) —
**beheerder moet wél alle actieve gebruikers kunnen zien/selecteren**.
`haalHerToewijsbareMedewerkers` is teruggedraaid naar de oorspronkelijke
opzet: beheerder ziet iedereen, teamleider alleen de eigen teamgenoten
(ongewijzigd). Lokaal opnieuw getest (Erwin ziet weer alle 8 lokale
gebruikers) en teruggezet naar `main`/LIVE en `beta` op 2026-09-16.

Daarna een dashboard-restyling (Teams én Directie, 2026-09-16): (1)
`MaandomzetDonut` toont voortaan gefactureerd (blauw, `--chart-1`) én
onderhanden werk (koraal, `--coral`) als twee segmenten van het
maandtarget, met een kleine legenda eronder — het percentage in het
midden is nu "op schema" (gefactureerd + onderhanden werk t.o.v. target),
een volledig groene ring blijft gereserveerd voor het target puur met
gefactureerde omzet gehaald. Deze tegel stond alleen in de teamleider/
medewerker-weergave; nu ook toegevoegd aan de gedetailleerde Directie-
teamkaart (die hem nog niet had). (2) Helemaal boven aan de hele pagina
(vóór de periodeselector, voor iedere rol) een nieuw tegelpaar:
"Gefactureerd dit jaar (YTD)" (donkerblauw, `HeroTile` — nu met een
`variant`-prop, "primary" of "coral") en "Onderhanden werk" (koraal) —
beide een kale som van wat RLS deze gebruiker al laat zien (`jaarBrutoOmzet`/
`ohwTotaalGroep`), dus vanzelf bedrijfsbreed voor directie/finance/beheerder
en eigen-team(s) voor teamleider/medewerker, zonder extra rolcode. De twee
tegels die dit vervangt (`Gefactureerd dit jaar (YTD)` en `Nog te
factureren werk van het team`, tot nu toe per teamtabblad) zijn uit de
teamleider/medewerker-weergave gehaald; de onderliggende "per teamlid"-
uitsplitsing van onderhanden werk bleef staan, nu als kleine lijst zonder
de grote kaart. (3) "Per teamlid" (teamleider/medewerker-weergave) is een
tabel geworden (Teamlid / Fixed fee / Uren / Totaal) i.p.v. een grid van
vierkante tegels — `TeamlidKpiTegel` was daardoor nergens anders meer
gebruikt en is verwijderd (het type `TeamlidKpi` blijft bestaan).
Bijvangst tijdens het verifiëren: de bestaande "Onderhanden werk per
team"-kaarten (boven de Teams-tabs) tellen een factuuritem van een
medewerker in twee teams dubbel (ze groeperen op teamlidmaatschap van de
medewerker, niet op het eigen `team_id`-veld van het item — dezelfde soort
fout die `team_id` destijds moest oplossen, hier nooit doorgevoerd). Lokaal
getest (Erwin/Directie en Tom/teamleider, beide teamtabs, kleuren en
legenda kloppen, nieuwe topcijfers kloppen met de som van de losse
teamkaarten) en gepusht naar `beta` op 2026-09-16.

Diezelfde dag bleek de bijvangst pervasiever dan gemeld: dezelfde
teamlidmaatschap-i.p.v.-team_id-fout zat in bijna elke per-team-berekening
binnen `teamKaarten` (7 plekken) — niet alleen onderhanden werk, ook
Brutotarget-voortgang, bruto-/uren-omzet team, de omzet-per-medewerker-lijst,
de trendgrafiek, de MTD-tegel/donut én de gloednieuwe "Per teamlid"-tabel.
Voor élk team met een gedeeld (multi-team) teamlid gaf dit een te hoog
bedrag bij ieder van zijn teams. Alle 7 plekken consistent omgezet naar
`r.team_id === team.id`; rijen zonder team_id (nu leeg in de lokale data,
maar niet gegarandeerd op BETA/LIVE) tellen daardoor terecht nergens
specifieks meer mee — voor onderhanden werk expliciet zichtbaar gemaakt via
een "Geen team"-kaart (bedrijfsbreed voor directie/finance/beheerder, alleen
eigen items voor teamleider — zelfde onderscheid als de "Geen team"-tab bij
Factuuritems); voor de omzettabellen niet, want daar komt dat lokaal
(nog) niet voor. Lokaal opnieuw getest (Tom's eigen teamloze creditregel
verdween terecht uit beide teamtabs en verscheen alleen nog in "Geen team";
Team Benelux en Team International tellen nu allebei alleen hun eigen werk)
en gepusht naar `beta`, daarna op verzoek direct gepromoot naar `main`/LIVE
en `beta`, samen met de dashboard-restyling hierboven — beide op
2026-09-17.
`main` en `beta` staan weer gelijk.

Daarna nog drie kleinere fixes (2026-09-17): (1) "Voorgesteld tarief" bij
Nieuw factuuritem toonde altijd de opgehaalde klant-/medewerkerspecifieke
`tarieven`-rij (bv. €250 voor een klant met een oude, lagere afspraak) —
dat vult het veld nog steeds automatisch, maar de tekst erboven toont nu
alleen nog "Voorgesteld tarief: €330,00" (het kantoorstandaard, hardcoded
als `STANDAARD_UURTARIEF`) en alleen wanneer het ingevulde bedrag onder
die €330 ligt — een duwtje richting het huidige standaardtarief zonder de
historische `tarieven`-rij zelf aan te passen. De losstaande
`voorgesteldTarief`-state was daardoor nergens anders meer nodig en is
verwijderd. (2) Het bureaukosten-"B"-badge (achter het bedrag van een
factuuritem) was een grijze cirkel met grijze "B" — viel niet op. Nu een
lichtgroene cirkel (`bg-success/15`) met donkergroene "B" (`text-success`).
(3) Dossiernummer "TM104803K400" (Koerdistan, landcode "K4") gaf "Onbekend
dossiernummer" — de parse-regex in `dossiernummer.ts` eiste altijd 2
letters voor de landcode (`[A-Z]{2}`), terwijl Patricia soms een cijfer in
die landcode gebruikt. Regex aangepast naar "eerste teken een letter,
tweede letter of cijfer" (`[A-Z][A-Z0-9]`) — sluit een dossiernummer zonder
landcode (enkel cijfers) nog steeds uit. "K4" ook toegevoegd aan de
statische `LANDNAMEN`-fallbacklijst (moet 1-op-1 gelijk blijven aan de
`landcodes`-tabel, was er bij het toevoegen van K4 aan die tabel niet ook
bijgewerkt). Lokaal getest: tarief-nudge verschijnt bij €170 (Lipton-tarief)
en verdwijnt bij €400; B-badge-kleur geverifieerd in de DOM;
"TM104803K400" parseert nu naar "Merken · Koerdistan" en is toe te voegen.
Gepusht naar `beta` — nog niet gepromoot naar `main`/LIVE.

Daarna een negenpuntsbatch optimalisaties (2026-09-17): (1)+(2) een
medewerker mag nu ook een factuuritem van een teamgenoot bekijken/bewerken
(niet alleen eigen items) en het naar een ander project verplaatsen — nieuwe
RLS-policy `factuuritems_update_teamgenoot` (migratie
`20260918100000_factuuritem_update_teamgenoot.sql`, scoped op het gedeelde
`team_id`) plus een losse policy voor de dossierregels zelf (migratie
`20260918110000_factuuritem_dossiers_teamgenoot.sql` — die tabel heeft haar
eigen RLS, werd bij de eerste migratie over het hoofd gezien, waardoor
opslaan met de foutmelding "Bijwerken van de dossiernummers is mislukt"
faalde). Ook `updateFactuurItem`'s server-side check voor "mag medewerker
wijzigen" uitgebreid met dit teamgenoot-geval (was alleen teamleider/
beheerder); zonder die fix negeerde de server een medewerkerwissel door een
medewerker stilzwijgend. Het factuuritem blijft standaard op de
oorspronkelijke medewerker staan (niet automatisch de bewerkende gebruiker),
wijzigingen komen gewoon in het wijzigingenlog. (3) Het datumveld bij
factuuritems toont voortaan altijd dd-mm-jjjj, ongeacht OS/browserlocale —
nieuwe `DatumInput`-component (tekstveld met auto-maskering, met een
kalender-icoon dat de native datepicker opent via `showPicker()`) i.p.v. een
kale `<input type="date">`, die zijn eigen weergave liet bepalen door de
locale van de gebruiker. (4) "Nieuw factuuritem" vanuit een klantpagina
vulde de klant al automatisch in (bestond al, geen wijziging nodig). (5) De
vlag-in-cirkel bij "Omzet per klant"/"per land" op het dashboard oogde niet
gecentreerd — `CountryFlag`'s twee vlag-varianten misten `flex items-center
justify-center` (de Globe-fallback had dit al); nu bij alle drie gelijk.
(6) KPI-tegel "Gefactureerd" had een verwarrend pijl-icoon; vervangen door
een €-icoon (beide "Gefactureerd"-tegels op het dashboard). (7) De
specificatie (concept-voorbeeld én de vastgelegde weergave) heeft een
nieuwe schakelaar "Groeperen op dossier" naast de standaard datumvolgorde —
`FactuurSpecificatie` is hiervoor een client component geworden;
`metSpecificatieDetailniveau` (nodig door server-only aanroepers) is
losgetrokken naar een nieuwe `src/lib/specificatie-detailniveau.ts` om geen
server/client-grens te doorkruisen. (8) Het Chronos-versienummer (laatste
`productchangelog`-entry) staat nu onderaan de zijbalk. (9) Handleiding
bijgewerkt: de rollentabel en Stap 4 vermelden nu teamgenoten-toegang en
"Verplaats naar project", Stap 5 vermeldt de nieuwe groeperen-op-dossier-
schakelaar. Lokaal end-to-end getest met een medewerker- (Anna) en een
teamleider-account (Tom in Team Benelux): een teamgenoot-item bekijken,
bewerken zonder ongewenste medewerkerwissel, verplaatsen naar project, en
het wijzigingenlog controleren (`gewijzigd_door` = de bewerkende
medewerker). Daarna ook getest als teamleider (Tom) en beheerder (Erwin) —
beide bestaande blanket-rechten (teamleider via `team_services_klant`,
beheerder onvoorwaardelijk) bleven intact, medewerker-dropdown toont voor
Tom zijn teamgenoten in beide teams en voor Erwin alle 8 actieve
gebruikers, Instellingen > Changelog (de bron van het versienummer) en de
Handleiding renderen goed voor beide rollen, geen console- of
servererrors. Op verzoek gepromoot naar `main`/LIVE op 2026-09-17.
`main` en `beta` staan weer gelijk.

Los van deze wachtrij: op de `feature/patricia-koppeling`-branch loopt de
Patricia-koppeling (dossiernummer/klant verplicht maken vanuit Patricia,
dossiernaam automatisch invullen) — nog niet gemerged in `beta`, wacht op de
netwerkoplossing (Vercel ↔ Patricia) voordat dat zinvol getest kan worden op
een gehoste omgeving.

## 1. Omgevingen-overzicht

| | **LIVE** | **BETA** | **TEST** |
|---|---|---|---|
| Doel | Echte facturatie Knijff | Test met echte Knijff-gebruikers | Development, CI, experimenteren |
| Data | Echte klanten/dossiers | Eigen, realistische maar verzonnen data | Klein, wegwerpbaar demoseed |
| Supabase-project | `Chronos` (bestaand, `trkdqsvsadvaibgsvmwz`) | Nieuw project ("Chronos Beta") | Nieuw project ("Chronos Test") of lokale Docker-stack |
| Git-branch | `main` | `beta` | featurebranches / PR's |
| Vercel | Production environment | Preview, branch-gebonden env vars, vast alias | Preview (standaard, per PR) |
| HubSpot | Live token | Zelfde token (read-only) | Zelfde token (read-only) |
| Toegang | Alle Knijff-gebruikers | Uitgenodigde beta-testers | Alleen developers |
| Backups | Dagelijks + PITR | Dagelijks | Geen (wegwerpbaar) |

## 2. Blokkerende technische voorwaarde — eerst oplossen

`package.json`'s `vercel-build`-script bevat nu een **hardcoded** Supabase-project-ref:

```
supabase link --project-ref trkdqsvsadvaibgsvmwz --password "$SUPABASE_DB_PASSWORD" && supabase db push --linked --yes && ...
```

Zolang dit zo blijft, pusht **elke** build — ook een toekomstige BETA- of TEST-deploy —
zijn migraties naar de productiedatabase, ongeacht welke `NEXT_PUBLIC_SUPABASE_URL` de
app zelf gebruikt. Dit moet eerst worden aangepast naar een environment-variabele:

```
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" && ...
```

met `SUPABASE_PROJECT_REF` per Vercel-omgeving/branch ingesteld op het juiste project.
Zonder deze fix is een meeromgevingen-opzet niet veilig, hoe je de rest ook inricht.

## 3. Branch- en deploystrategie

Eén Vercel-project, drie soorten deploys via branch-gebonden environment variables
(geen Pro/Enterprise-only "custom environments" nodig — branch-specifieke Preview-env
vars zijn op elk Vercel-plan beschikbaar):

- **`main`** → Production-deploy → LIVE-project. Zoals nu.
- **`beta`** → Preview-deploy met een **vast alias/domein** (bv. `beta.chronos...`) en
  branch-specifieke env vars die naar het BETA-project wijzen. Alleen bewuste merges
  naar `beta` (na review) landen hier — dit is de omgeving die getest is voordat hij
  naar `main` gaat.
- **Featurebranches / PR's** → gewone Preview-deploys, env vars wijzen naar het
  TEST-project (of blijven leeg/lokaal als een PR geen database-wijziging raakt).

Promotiepad: featurebranch → (getest, PR-review) → `beta` → (beta-feedback verwerkt) →
`main`. Niets slaat een stap over.

## 4. Data en seeding

- **TEST**: het bestaande `scripts/seed.mjs` hoeft niet te veranderen — het is al
  omgeving-onafhankelijk (leest `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
  uit de environment). Gewoon opnieuw draaien tegen het TEST-project. Wegwerpbaar:
  gerust vaker resetten.
- **BETA**: dezelfde soort seed, maar rijker en realistischer — meer klanten, meer
  historische factuuritems over meerdere maanden, teams die aansluiten bij de echte
  Knijff-structuur. Géén namen die verward kunnen worden met echte cliënten (dus niet
  "Arcadis"-achtige placeholders die toevallig een bestaande relatie raken, maar
  duidelijk fictieve namen). Dit is een uitbreiding van `scripts/seed.mjs`, geen nieuw
  script.
- **LIVE**: ongewijzigd, blijft de enige plek met echte data.

## 5. Backups

- **LIVE**: bevestigen dat het Supabase-plan point-in-time recovery (PITR) of op zijn
  minst dagelijkse backups aanbiedt, en dat dit daadwerkelijk aan staat. Minstens één
  keer een proefherstel doen — een backup die nooit is terugezet is geen geverifieerde
  backup.
- **BETA**: dagelijkse backup is voldoende (geen bron-van-waarheid-data, maar wel
  vervelend om een testperiode te moeten resetten door een foute migratie).
- **TEST**: geen backup nodig — bedoeld om kapot te maken en opnieuw te seeden.

## 6. Monitoring

Er is nu geen foutregistratie. Voor te stellen, van makkelijk naar meer werk:

1. **Vercel Logs/Monitoring** (al beschikbaar, niets bij te bouwen) — even afspreken
   wie dit periodiek bekijkt tijdens de betaperiode.
2. **Foutregistratie in de app** (bv. Sentry, gratis tier) op LIVE en BETA — zodat een
   fout die een betatester tegenkomt automatisch binnenkomt, in plaats van dat die het
   moet melden.
3. **Uptime-check** op de LIVE-URL (simpele ping-monitor, bv. via Vercel's eigen
   monitoring of een gratis externe dienst).
4. Supabase's eigen dashboard (verbindingen, trage queries) in het oog houden zodra er
   meer gebruikers op LIVE komen.

## 7. Toegang en beveiliging

- BETA- en TEST-URL's zijn raadbaar/vindbaar als er niets aan gedaan wordt. Zet Vercel
  Deployment Protection aan op de BETA-deploy (wachtwoord of Vercel-account-gebonden,
  afhankelijk van het Vercel-plan); is dat niet beschikbaar, dan minstens een
  `noindex`-meta en een niet voor de hand liggende subdomeinnaam.
- BETA heeft een eigen Supabase Auth — betatesters moeten daar apart worden toegevoegd
  (of self-signup toestaan, met een uitnodigingslijst). Magic-link-mails uit BETA gaan
  naar echte Knijff-postvakken; zorg dat voor de tester duidelijk is dat dit de
  testomgeving is (bv. een duidelijk afwijkende afzendernaam), zodat niemand ingevoerde
  testdata per ongeluk als echt behandelt.

## 8. Stappenplan (uitvoering)

1. `vercel-build` aanpassen: project-ref uit environment-variabele i.p.v. hardcoded
   (zie §2). Verifiëren dat LIVE-deploys ongewijzigd blijven werken.
2. Nieuwe Supabase-projecten aanmaken: "Chronos Beta" (en "Chronos Test", als een
   gedeelde/hostede testomgeving gewenst is naast lokale Docker-stacks).
3. Volledige migratiehistorie op de nieuwe project(en) toepassen (`supabase db push`)
   zodat het schema gelijk is aan LIVE.
4. `scripts/seed.mjs` uitbreiden met een rijkere BETA-dataset (zie §4) en draaien tegen
   zowel TEST als BETA.
5. In Vercel: branch `beta` aanmaken, branch-gebonden environment variables instellen
   (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_DB_PASSWORD`) die naar het BETA-project wijzen, en een vast alias/domein
   toewijzen aan de branch-deploy.
6. Deployment Protection aanzetten op de BETA-deploy (§7).
7. Backups verifiëren voor LIVE (bestaand) en instellen voor BETA (§5).
8. Basale foutregistratie toevoegen (§6, punt 2) op LIVE en BETA.
9. Betatesters bepalen en toevoegen als Auth-gebruiker in het BETA-project.
10. Droogoefening: de kernstromen (inloggen, tijdschrijven, factuuritem aanmaken,
    specificatie maken) eenmaal zelf doorlopen op BETA vóór de eerste uitnodiging.
11. Kort onboardingberichtje voor betatesters schrijven: wat dit is, dat het losstaat
    van hun echte werk, en waar ze feedback/bugs kunnen melden.
12. Promotiepad afspreken (§3): wanneer en hoe verwerkte beta-feedback van `beta` naar
    `main` gaat.

## 9. Openstaande aandachtspunten

- HubSpot-API-quotum is gedeeld over alle omgevingen (één token) — bij zwaar
  testgebruik op BETA/TEST kan dat theoretisch productiegebruik raken. Klein risico,
  geen sandbox nodig, maar wel iets om in het oog te houden als het een keer knelt.
- Eigenaarschap: wie is tijdens de betaperiode het aanspreekpunt voor monitoring,
  backups en het verwerken van feedback? Voor nu vermoedelijk Erwin — met het team
  groter wordt dit explicieter verdelen.
