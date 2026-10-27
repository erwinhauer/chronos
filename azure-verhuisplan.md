# Chronos: verhuisplan naar Azure

*Opgesteld 2026-10-23, deel 2 van het tweestappenplan. Deel 1 (hoe het nu in elkaar zit) staat in [`azure-overdracht.md`](azure-overdracht.md); dit plan bouwt daarop voort.*

## 1. Advies in het kort

- Verhuis in twee stappen: eerst de infrastructuur (app, database, inloggen, bestanden) met zo min mogelijk codewijzigingen, daarna Entra ID. Niet tegelijk.
- Houd de Supabase-diensten (API-laag, Auth, Storage) aan voor de verhuizing, draai ze zelf op Azure en gebruik Azure Database for PostgreSQL als database, mits een korte proef bevestigt dat dat technisch kan. Zie hoofdstuk 2.
- Bouw een testfase in, in twee rondes: eerst een lege omgeving met dummydata om de inrichting en de koppeling met Patricia te valideren, daarna een volledige generale repetitie met een kopie van de echte data, inclusief tijdmeting van de overstap.
- Voor de overstap zelf is een korte onderhoudsvenster (verwacht 30 tot 60 minuten, buiten kantoortijd) beter dan een gecompliceerde zero-downtime-constructie. De database is klein genoeg, de gebruikers zijn intern en het terugdraaien blijft eenvoudig.
- Laat Vercel en Supabase na de overstap een tijd ongewijzigd staan, als terugvaloptie.

## 2. De beslissing waar alles van afhangt

Chronos praat voor al zijn data, inloggen en bestanden met Supabase (zie overdracht, hoofdstuk 1 en 3). Een gewone beheerde PostgreSQL op Azure is daarom niet voldoende om de applicatie ongewijzigd te laten draaien. Er zijn twee routes:

| | Route A: Supabase-diensten zelf draaien | Route B: gewone PostgreSQL, app aanpassen |
|---|---|---|
| Wat verandert in de code | Vrijwel niets (adressen en sleutels) | Datatoegang in 27 bestanden, alle inlogschermen, avatar-upload |
| Wat de beheerder erbij krijgt | Vier extra containers (API-laag, Auth, Storage, gateway) | Alleen app en database |
| Entra ID later | Configuratie van de ingebouwde Azure-provider | Onderdeel van de herbouw |
| Risico | Past Supabase op Azure Flexible Server? (proef nodig) | Veel werk, regressierisico in rechten (52 RLS-policies) |
| Geschatte doorlooptijd verhuizing | Weken | Maanden |
| Terugdraaien | Eenvoudig | Moeilijker, want de code verandert mee |

Aanbeveling: route A. Route B is een goede eindstaat als Knijff geen containers wil beheren, maar dan is het een eigen project na de verhuizing en niet iets om in dezelfde beweging te doen.

De proef die route A bevestigt of afwijst staat in het stappenplan als stap 1.

## 3. Fasering

### Fase 0. Voorbereiding (Erwin en de beheerder, parallel)

- Vul de gegevens uit hoofdstuk 12 van het overdrachtsdocument in (databasegrootte, rijen, gebruikers, SMTP, domein, plannen).
- Besluit route A of B (hoofdstuk 2) en wie wat beheert.
- Zet de broncode over van het persoonlijke GitHub-account naar een organisatie van Knijff (of Azure DevOps), zodat de pijplijn van het bedrijf is en niet van een persoon.
- Maak servicesaccounts voor HubSpot en Patricia (alleen-lezen) in plaats van persoonlijke accounts.
- Kies en regel het domein: wie beheert de DNS, kan de TTL vooraf naar 5 minuten.

### Fase 1. Proef met de infrastructuur (route A), 2 tot 3 dagen

Doel: bevestigen dat het kan, voordat er meer wordt gebouwd.

- Maak in een testabonnement een Azure Database for PostgreSQL Flexible Server aan.
- Draai de Supabase-diensten (API-laag, Auth, Storage, gateway) in containers ernaast.
- Controleer: extensies `pgcrypto` en `pg_cron`, de rollen `anon`, `authenticated`, `service_role`, de schema's `auth` en `storage`, en `SECURITY DEFINER`-functies.
- Voer alle 53 migraties uit op de lege database en laat een rooktest slagen.
- Uitkomst: ja (verder met route A), of nee (terugval: dezelfde stack met Postgres in een container of op een VM met beheerde schijf, of route B).

### Fase 2. TEST-omgeving met dummydata, 1 tot 2 weken

Doel: de hele keten werkend krijgen zonder dat echte klantdata in het spel is.

- Richt de omgeving in zoals LIVE straks wordt (hoofdstuk 5 van de overdracht): app-hosting, database, containers, Key Vault, VNet, domein met testcertificaat.
- Bouw de pijplijn: bouwen, containerimage, databasemigraties, uitrollen. De huidige `vercel-build`-stappen (migraties, changelog-script, build) worden stappen in deze pijplijn.
- Voeg aan de repo toe: een Dockerfile en `output: "standalone"` in `next.config.ts`.
- Vul de database met `scripts/seed.mjs` (7 demogebruikers, 2 teams, 2 klanten).
- Test: inloggen (wachtwoord, magic link, wachtwoord vergeten, uitnodigen), alle rollen, factuuritems aanmaken, specificatie-PDF genereren, avatar uploaden, e-mail ontvangen.
- Test de koppeling met Patricia vanaf de app-server (zie hoofdstuk 4) en met HubSpot.
- Laat de beheerder toegangsbeheer, logging en netwerkregels beoordelen.

Uitkomst: een werkende TEST-omgeving, een beproefde pijplijn en een lijst met bevindingen voor de beheerder.

### Fase 3. BETA op Azure met een kopie van productiedata, 1 tot 2 weken

Doel: de generale repetitie, met echte data en echte gebruikers uit een kleine groep.

- Neem een volledige kopie van LIVE: databasedump, auth-schema (gebruikers en wachtwoord-hashes) en de Storage-bestanden (stappen in hoofdstuk 6). Doe dit alleen in een omgeving met dezelfde beveiliging als LIVE, want de kopie bevat klantgegevens. Anonimiseren is niet nodig als de omgeving even streng is ingericht; wel nodig als de testers extern zijn of de omgeving losser beveiligd is.
- Zet de BETA-omgeving op Azure (de branch `beta` gaat voortaan naar Azure), met een kopie van de productiedata.
- Laat een paar gebruikers ten minste een week normaal werken en vergelijk: kloppen de totalen op het dashboard, de specificaties, de auditlog en de rechten per rol met wat in LIVE staat?
- Doe de overstap-procedure uit hoofdstuk 6 één keer volledig als repetitie en meet de tijd per stap. Die tijden bepalen de lengte van het onderhoudsvenster.
- Test het terugdraaien: kunnen we terug naar Vercel en Supabase, en hoe lang kost dat?

Uitkomst: een gemeten draaiboek, een go/no-go-beslissing en bevestiging dat dashboards en rechten overeenkomen.

### Fase 4. Overstap LIVE, 1 avond

Zie hoofdstuk 6 voor het draaiboek.

### Fase 5. Nazorg en opruimen, 2 tot 4 weken

- Intensief meekijken in logs en bij de gebruikers in de eerste week.
- Vercel en Supabase LIVE ongemoeid laten voor een afgesproken periode, bijvoorbeeld 2 tot 4 weken, de Supabase-database alleen-lezen zetten.
- Daarna Vercel en Supabase afbouwen: definitieve dump bewaren op een veilige plek, projecten pauzeren, dan verwijderen, en de abonnementen beëindigen.
- Bijwerken van `documentation.md` en het werkproces ("push naar beta" wordt een Azure-uitrol).
- Daarna pas Entra ID (hoofdstuk 7).

## 4. Patricia in de nieuwe situatie

Dit is de reden voor de verhuizing, dus apart benoemd.

- Zodra de app-server en de Patricia-server in Azure staan, kan Chronos rechtstreeks via het interne netwerk met Patricia praten. De Vercel-beperking (alleen via de VPN of een extra API-laag) vervalt, evenals `patricia_api.md`.
- De Patricia-code staat nu alleen op `feature/patricia-koppeling`, niet op `beta` of `main`. Op Vercel kan hij niet draaien, want Vercel bereikt Patricia niet. Let op: de code behandelt een ontbrekende of onbereikbare Patricia als validatiefout. Zonder Patricia-verbinding kun je dus geen dossier meer toevoegen. Samenvoegen met `beta` of `main` terwijl ze nog op Vercel draaien zou het invoeren van factuuritems breken. Aanbeveling: laat de Patricia-code op de featurebranch staan tot Azure draait. De TEST- en BETA-omgevingen in Azure (fase 2 en 3) draaien die branch of een samenvoeging ervan; LIVE krijgt de Patricia-code pas bij de overstap. Wil Erwin dit toch eerder samenvoegen, dan is een kleine aanpassing nodig: een instelling die Patricia uitzet, zodat dossiers dan zonder controle worden toegevoegd zoals nu.
- Nodig van de beheerder: netwerkroute en firewallregel (alleen app-subnet naar poort 1433), een alleen-lezen SQL-account en bevestiging welke Patricia-database de bron is (er zijn meerdere gelijknamige; `Patricia` is de live, `Patricia_Upgrade` een oudere kopie).
- Test in fase 2 en 3 met leesqueries op de echte Patricia, zoals nu lokaal.

## 5. Risico's en wat we eraan doen

| Risico | Gevolg | Maatregel |
|---|---|---|
| Supabase-diensten werken niet op Azure Flexible Server | Route A vertraagt | Proef in fase 1; terugval Postgres in een container |
| RLS-rechten gedragen zich anders na migratie | Gebruikers zien te veel of te weinig | Vergelijkingstest per rol in fase 3 (zelfde acties in oude en nieuwe omgeving) |
| Gebruikers-ID's of wachtwoorden gaan verloren | Iedereen moet opnieuw worden aangemaakt, koppelingen breken | `auth`-schema meeverhuizen in plaats van gebruikers opnieuw aanmaken; steekproefsgewijs inloggen testen |
| E-mail van Auth komt niet aan (SPF/DKIM, relay) | Magic link en wachtwoordherstel werken niet | SMTP-relay en afzenderdomein vroeg regelen en testen in fase 2 |
| Sessies vervallen bij de overstap | Gebruikers zijn uitgelogd | Eén keer aankondigen; geen dataverlies |
| `NEXT_PUBLIC_*`-waarden in de browserbundel verwijzen naar de oude omgeving | App praat met de verkeerde backend | Een omgevingsvariabele is een buildinput: per omgeving een eigen build |
| DNS-wijziging duurt lang | Lange overgang met twee omgevingen | TTL vooraf verlagen; DNS-controle door de beheerder |
| Databasemigraties lopen tijdens de build (zoals nu) en falen | Deploy mislukt halverwege | Migraties als aparte pijplijnstap met rollback-plan, niet verstopt in de build |
| Verschil in tijdzone, collatie of Postgres-versie | Sorteervolgorde, datums of functies wijken af | Dezelfde hoofdversie van Postgres kiezen als Supabase nu draait (controleren in het dashboard) en in fase 3 vergelijken |
| Geheimen komen tijdens het overzetten op onveilige plekken | Datalek | Alleen via Key Vault; nooit via chat of e-mail; sleutels roteren bij de overstap |
| Data blijft achter bij Supabase of Vercel na afloop | Vertrouwelijke gegevens bij een derde | Aan het eind verwijderen en dat vastleggen (hoofdstuk 3, fase 5) |

## 6. Draaiboek van de overstap (LIVE)

### Voorbereiding, een tot twee weken ervoor

- Het draaiboek is in fase 3 gemeten en goedgekeurd; het onderhoudsvenster staat vast (bijvoorbeeld zondagavond) en is aangekondigd aan alle gebruikers, met de afspraak dat inloggen daarna één keer opnieuw moet.
- DNS-TTL staat op 5 minuten.
- De nieuwe LIVE-omgeving staat klaar, is leeg en is getest met een rooktest.
- Backup van LIVE bij Supabase is vers gemaakt en uit de laatste dagen is een proefherstel gedaan.
- Geheimen in Key Vault; nieuwe sleutels voor de nieuwe omgeving (de service-role-sleutel en de JWT-sleutel zijn nieuw en dus niet dezelfde als nu).

### De avond zelf, met geschatte tijd

1. Aankondiging bevestigen en de applicatie op Vercel in onderhoudsmodus zetten (alleen-lezen is ook goed). Controleer dat er geen actieve schrijfacties meer zijn. (5 minuten)
2. Laatste dump van de LIVE-database: schema `public` met data, plus het schema `auth` (gebruikers en wachtwoord-hashes). Bewaar de dump versleuteld. (5 tot 10 minuten bij een kleine database)
3. Herstel op Azure: eerst de rollen en schema's, dan `auth`, dan `public` met data, dan de migratiehistorie bijwerken zodat de pijplijn de juiste stand kent. (10 tot 20 minuten)
4. Kopieer de bestanden van de Storage-bucket `avatars` (en `facturen` als er iets in staat). (5 minuten)
5. Controleer de gegevens: rijtellingen per tabel gelijk aan de bron, controlesommen op de belangrijkste totalen (bijvoorbeeld de som van de bedragen op `factuuritems` en `facturatiebatches`), aantal gebruikers en rollen gelijk. (10 minuten)
6. Rooktest op de nieuwe omgeving via een tijdelijke URL: inloggen met een testaccount per rol, een factuuritem aanmaken en weer verwijderen, een specificatie-PDF genereren, een avatar tonen, Patricia-opzoeking werkt. (10 minuten)
7. DNS omzetten naar de nieuwe omgeving; wachten tot de verandering doorgevoerd is. (5 tot 10 minuten)
8. Controle op het echte domein; berichten naar de gebruikers dat het weer kan. (5 minuten)

Totaal circa 1 uur tot 1,5 uur, afhankelijk van de datagrootte. De werkelijke duur komt uit de repetitie in fase 3.

### Terugdraaien

Een beslismoment na stap 6, vóór de DNS-wijziging: faalt de rooktest of kloppen de totalen niet, dan stoppen we en blijft de oude omgeving gewoon in gebruik; er is dan niets gewijzigd voor de gebruikers. Na de DNS-wijziging kan nog worden teruggedraaid door de DNS terug te zetten, maar dan gaan wijzigingen die al in Azure zijn gemaakt verloren (of moeten handmatig terug). Daarom is de afspraak: de eerste uren na de overstap kijkt iemand actief mee, en de oude Supabase-database blijft ongewijzigd (alleen-lezen) staan tot de nazorgperiode voorbij is.

### Waarom een onderhoudsvenster en geen zero-downtime

Een live replicatie van Supabase naar Azure met een afgeronde, gelijktijdige overstap is technisch mogelijk, maar kost veel extra opzet en risico (replicatie-instellingen, tabelvolgorde, `auth`-schema, sequences). Voor een interne applicatie met een kleine database en bekende piekmomenten is een korte onderhoudsstop geen ramp, en het afgesproken uur levert minder kans op fouten. Als de gemeten datavolume in fase 3 toch grotere verschillen laat zien, kan dit opnieuw worden bekeken.

## 7. Entra ID (stap na de verhuizing)

- Maak een Entra ID app-registratie (de beheerder) en zet de Azure/Entra-provider aan in Auth (bij route A is dat een instelling).
- Koppel bestaande gebruikers op e-mailadres, zodat profielen, rollen en alle historie behouden blijven.
- Eerst een periode waarin wachtwoord én Microsoft-login allebei werken, daarna pas wachtwoord-inloggen uitzetten.
- De gebruiker-aanmaak vanuit het beheerscherm (`src/actions/admin.ts`) wijzigt dan van "account aanmaken met wachtwoord" naar "gebruiker en rol voorbereiden, inloggen via Microsoft". Dat is een aparte, kleine wijziging.
- Later eventueel: rollen koppelen aan Entra-groepen.

## 8. Wie doet wat

| Onderdeel | Erwin | Systeembeheerder | Claude (ontwikkeling) |
|---|---|---|---|
| Invullen dashboardgegevens | ja | helpt | |
| Keuze route A of B | beslist | adviseert | levert de afweging |
| Azure-resources, netwerk, Key Vault, DNS | | ja | |
| Patricia-account, netwerkroute, firewall | | ja | |
| Dockerfile, standalone-build, pijplijnscripts | reviewt | reviewt | bouwt |
| Migratie- en kopieerscripts, controlerapporten | reviewt | reviewt | bouwt |
| Gebruikerscommunicatie, onderhoudsvenster | ja | | helpt met teksten |
| Rooktests en vergelijking per rol | ja | | helpt met testscripts |
| Uitvoering van de overstap | aanwezig | voert uit | ondersteunt |
| Afbouw van Vercel en Supabase | ja | helpt | |

## 9. Wat ik aanraad als eerste stappen

1. Erwin en de beheerder lezen het overdrachtsdocument en vullen hoofdstuk 12 in.
2. Besluit route A of B. Aanbeveling: A.
3. Bij route A: fase 1 inplannen als korte proef.
4. Zodra de proef slaagt: de Dockerfile en de pijplijn laten bouwen. De Patricia-branch blijft apart tot Azure draait (zie hoofdstuk 4).
5. Op basis van de gemeten tijden in fase 3 pas het overstapmoment vastleggen.
