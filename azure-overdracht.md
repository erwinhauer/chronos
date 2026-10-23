# Chronos: overdrachtsdocument voor de verhuizing naar Azure

*Opgesteld 2026-10-23, deel 1 van het tweestappenplan. Deel 2 staat in [`azure-verhuisplan.md`](azure-verhuisplan.md).*

Dit document beschrijft hoe Chronos nu technisch in elkaar zit, welke diensten er bij Vercel en Supabase draaien en wat er nodig is om het in Azure in te richten. Het is geschreven voor de systeembeheerder. Dit is een momentopname; de actuele technische referentie is [`documentation.md`](documentation.md).

Leeswijzer: waar iets uit de code of de repository volgt, staat het hier als feit. Waar het alleen in het Vercel- of Supabase-dashboard te zien is (en dus niet in de repo), staat een invulveld met `[INVULLEN]`. Die velden staan gebundeld in hoofdstuk 12, met de opdracht erbij om ze te vullen.

## 1. Samenvatting en de belangrijkste conclusie

Chronos is een Next.js-webapplicatie voor tijdschrijven en specificaties bij Knijff. De applicatie praat voor al haar data, inloggen en bestandsopslag met Supabase, en leest dossiergegevens uit Patricia (SQL Server).

De conclusie die de inrichting bepaalt: **Chronos gebruikt Supabase als complete backend, niet alleen als database.** Een gewone beheerde PostgreSQL op Azure is daarom niet genoeg om de applicatie ongewijzigd te laten draaien. Concreet:

- Alle gegevens gaan via de Supabase-API (PostgREST) met de `supabase-js`-client: 122 aanroepen in 27 bestanden, plus 7 database-functies via RPC.
- Autorisatie zit in de database zelf: 52 Row Level Security-policies die steunen op `auth.uid()` uit het Supabase Auth-schema.
- Inloggen (wachtwoord, magic link, wachtwoordherstel, uitnodigingen) loopt via Supabase Auth.
- Profielfoto's staan in Supabase Storage.
- Een databasetrigger staat op `auth.users`, een tabel die Supabase Auth beheert.

Daaruit volgen twee routes naar Azure. Welke het wordt is de eerste beslissing, zie hoofdstuk 3 en het verhuisplan.

## 2. Huidige architectuur

```
Gebruiker (browser)
   |  HTTPS
Vercel: Next.js 16 (server-side rendering, server actions, PDF-generatie)
   |-- HTTPS --> Supabase: Postgres + PostgREST + Auth + Storage   (3 omgevingen)
   |-- HTTPS --> HubSpot API (api.hubapi.com)
   '-- TCP 1433 --> Patricia SQL Server (10.171.174.204)   (alleen op branch feature/patricia-koppeling)
```

Onderdelen:

| Onderdeel | Nu | Opmerking |
|---|---|---|
| Frontend en server | Next.js 16.2 (App Router), React 19, TypeScript 5, Tailwind 4 | Draait als Node-proces; vereist Node 20.9 of hoger |
| Hosting | Vercel, project `chronos` | Zie hoofdstuk 5 |
| Database en backend | Supabase (Postgres, PostgREST, Auth, Storage) | 3 omgevingen, zie hoofdstuk 4 |
| PDF-generatie | `@react-pdf/renderer`, server-side en on-demand | Geen opslag; bij elke download opnieuw gegenereerd |
| Dossiergegevens | Patricia (SQL Server) via `mssql`, NTLM | Alleen lezen, zie hoofdstuk 8 |
| CRM-aanvulling | HubSpot REST API | Alleen lezen, zie hoofdstuk 8 |
| Broncode | GitHub, `erwinhauer/chronos` | Persoonlijk account, zie hoofdstuk 10 |

Er is geen aparte API-laag, geen message queue, geen cache-server, geen cronjob buiten de database en geen Vercel-specifieke functies (geen Edge-functies, geen `vercel.json`, geen Vercel-cron, geen Vercel Blob of KV). Dat maakt de verhuizing van de applicatielaag eenvoudig.

## 3. Wat er in Azure nodig is

### 3.1 Drie omgevingen

Nu zijn er drie omgevingen, elk met een eigen Supabase-project. Dezelfde indeling is in Azure het uitgangspunt.

| | LIVE | BETA | TEST |
|---|---|---|---|
| Doel | Echte werkzaamheden en specificaties | Testen met echte gebruikers, verzonnen data | Ontwikkeling en experimenten |
| Git-branch | `main` | `beta` | featurebranches |
| Nu gehost | Vercel Production | Vercel Preview met vast alias | lokaal (Docker) |
| Supabase | project `trkdqsvsadvaibgsvmwz` | project "Chronos Beta" (eu-north-1) | lokale Docker-stack |
| Backups | dagelijks, geen PITR | dagelijks | geen |

### 3.2 Twee manieren om de backend in Azure te zetten

Dit is de beslissing waar de rest van het plan van afhangt.

**Route A: Supabase-diensten zelf draaien op Azure.** De applicatiecode blijft vrijwel ongewijzigd. Nodig zijn vier containers naast de applicatie: PostgREST (de API-laag), GoTrue (Auth), de Storage-API en een gateway (Kong of vergelijkbaar), plus een Postgres. Die Postgres kan Azure Database for PostgreSQL Flexible Server zijn, mits de Supabase-onderdelen daar kunnen draaien. Dat is het punt om vooraf te testen (hoofdstuk 3.3).

**Route B: gewone Azure PostgreSQL en de applicatie aanpassen.** De Supabase-diensten verdwijnen. De applicatie krijgt een directe databaselaag in plaats van `supabase-js`, inloggen gaat via Microsoft Entra ID, en de profielfoto's gaan naar Azure Blob Storage. Dit is de schoonste eindsituatie, maar het is een herbouw van de datatoegang (27 bestanden, 52 policies die op `auth.uid()` steunen, alle inlogschermen), geen verhuizing.

Aanbeveling: **route A voor de verhuizing, Entra ID daarna als aparte stap.** Redenen: de verhuizing blijft klein en terugdraaibaar, de applicatiecode verandert nauwelijks, en GoTrue ondersteunt Microsoft Entra ID als inlogprovider. Entra ID later toevoegen is dus een configuratiewijziging plus koppeling van bestaande gebruikers, geen herbouw. Route B wordt pas interessant als jullie geen containers willen beheren, en dan is het een apart project.

### 3.3 Eerst te testen bij route A

Supabase Auth en Storage verwachten bepaalde databaserollen en rechten die op een beheerde Azure-server niet vanzelfsprekend zijn (Azure geeft geen volledige superuser). Voordat er verder wordt gebouwd moet een korte proef bevestigen dat de volgende dingen werken op Azure Database for PostgreSQL Flexible Server:

- extensies `pgcrypto` en `pg_cron` zijn toegestaan en geladen (zie 4.5)
- de rollen `anon`, `authenticated`, `service_role` en de beheerrollen van Auth en Storage kunnen worden aangemaakt
- de schema's `auth` en `storage` kunnen worden aangemaakt door de beheerrol
- `ALTER DEFAULT PRIVILEGES` en `SECURITY DEFINER`-functies werken zoals in Supabase

Als dat niet lukt, is de terugvaloptie dezelfde stack met de Postgres in een container of op een VM met beheerde schijf. Dat is minder "managed", maar functioneel gelijk.

## 4. Databaseoverzicht

### 4.1 Tabellen (schema `public`, 16 tabellen)

| Tabel | Inhoud |
|---|---|
| `klanten` | Klant/opdrachtgever, met koppel-ID's `hubspot_id`, `patricia_id`, `accountview_debiteurnummer` en weergave-instellingen voor de specificatie |
| `factuuritems` | Eén regel tijdschrijven of werkzaamheid (was `registraties`); hoofdtabel qua volume |
| `factuuritem_dossiers` | Koppeltabel factuuritem en dossiernummers, met dossiernaam, type dienst en land |
| `factuuritem_wijzigingen` | Wijzigingslog per factuuritem |
| `facturatiebatches` | Gegenereerde specificatie per klant en periode, met snapshot van totalen |
| `specificaties` | Vermoedelijk vestigiaal, wordt niet beschreven (zie `documentation.md` §5) |
| `projecten` | Projecten per klant |
| `tarieven` | Uurtarieven per klant of medewerker met geldigheidsperiode |
| `teams`, `team_members`, `teamdoelen` | Teamindeling en jaarlijkse omzetdoelen |
| `profiles`, `profile_roles` | Gebruikersprofielen en rollen (een-op-een gekoppeld aan `auth.users`) |
| `landcodes` | ISO-landcodes met namen (NL en EN) |
| `productchangelog` | Voedt de "Wat is er nieuw"-weergave in de app |
| `auditlog` | Logboek van acties; 60 dagen bewaard |

Totaal 53 migratiebestanden in `supabase/migrations/`, oplopend op datum. Samen vormen ze het volledige schema en zijn ze op een lege database in volgorde uit te voeren. De eerste is `20260721160000_init_schema.sql`, de laatste (per nu) `20260929100000_kolom_uren_zichtbaar_default_aan.sql`.

### 4.2 Typen, functies, triggers

- Enums (9): `user_role`, `factuuritem_status`, `batch_status`, `klant_status`, `korting_type`, `prijstype`, `specificatietaal`, `specificatietype`, `audit_actie`.
- Functies in `public` (16): `current_role_name`, `is_role`, `is_active_user`, `shares_team_with`, `team_services_klant`, `switch_active_role`, `resolve_tarief`, `set_klant_taal`, `set_klant_valuta`, `supplement_klant_vanuit_hubspot`, `auditlog_opslaggrootte`, `write_auditlog`, `enforce_profile_self_edit_limits`, `handle_new_user`, `set_updated_at` en `set_laatst_bewerkt_door`. Zeven daarvan worden vanuit de app als RPC aangeroepen: `auditlog_opslaggrootte`, `resolve_tarief`, `set_klant_taal`, `set_klant_valuta`, `supplement_klant_vanuit_hubspot`, `switch_active_role`, `team_services_klant`. De meeste autorisatiefuncties zijn `SECURITY DEFINER`.
- Triggers: `updated_at`-triggers op de meeste tabellen, auditlog-triggers op `klanten`, `factuuritems`, `tarieven`, `facturatiebatches`, een zelfbewerkingsbeperking op `profiles`, en **`trg_on_auth_user_created` op `auth.users`**. Die laatste maakt bij een nieuwe gebruiker automatisch een profiel aan. Hij staat op een tabel van Supabase Auth en moet dus op de nieuwe auth-opzet worden aangesloten.

### 4.3 Row Level Security

52 policies in `public`, op alle 16 tabellen (RLS staat overal aan), plus 3 policies op `storage.objects` voor de bucket `avatars`. Geteld in de lokale database; controleer hetzelfde in productie. Autorisatie hangt aan de actieve rol van de gebruiker (`medewerker`, `teamleider`, `finance`, `beheerder`, `directie`, zie `documentation.md` §4) en gebruikt `auth.uid()`. RLS is de enige beveiligingslaag voor data; de app voegt geen eigen rechtencontrole toe op queryniveau. Dat betekent: **elke omgeving moet RLS aan hebben en de rollen `anon` en `authenticated` met de juiste rechten kennen, anders is data onbedoeld open of juist dicht.**

### 4.4 Storage

- Bucket `avatars` (publiek leesbaar): profielfoto's, pad `<user-id>/<bestand>`. Policies steunen op `storage.foldername(name)` en `auth.uid()`. De app gebruikt `getPublicUrl`.
- Bucket `facturen` (privé): is in een eerdere migratie aangemaakt en bestaat nog, maar de bijbehorende policies zijn verwijderd toen facturatie vanuit Chronos is teruggedraaid. De bucket wordt niet meer gebruikt. Of er in productie nog bestanden in staan moet worden nagekeken `[INVULLEN]`. De specificatie-PDF's zelf worden niet opgeslagen.

### 4.5 Extensies en geplande taken

- Extensies die het schema zelf aanzet: `pgcrypto`, `pg_cron`. In de Supabase-database staan daarnaast de standaardextensies `uuid-ossp`, `pg_net`, `supabase_vault` en `pg_stat_statements`; de applicatie gebruikt die niet rechtstreeks, maar Supabase-diensten kunnen ze verwachten (route A).
- De lokale database is 13 MB met demodata. Productievolume: zie hoofdstuk 12.
- Eén cronjob: `auditlog-retentie-60-dagen`, dagelijks om 03:00, verwijdert auditlog-regels ouder dan 60 dagen (`delete from public.auditlog where created_at < now() - interval '60 days'`). Op Azure moet `pg_cron` zijn toegestaan en in `shared_preload_libraries` staan. Alternatief: dezelfde query als geplande taak buiten de database.

### 4.6 Wat uit het schema níet vanzelf meeverhuist

- Supabase Auth-gebruikers en hun wachtwoord-hashes (schema `auth`), zie hoofdstuk 6.
- Bestanden in Storage.
- Instellingen die alleen in het Supabase-dashboard staan: e-mailsjablonen voor Auth, SMTP-instellingen, `site_url` en toegestane redirect-URL's, JWT-levensduur. Deze staan niet in de repo en moeten uit het dashboard worden overgenomen (hoofdstuk 12).

## 5. Vercel: wat er draait

- Project `chronos` (project-ID `prj_fBqLnkkbeRwUVveTRZkjJfqOqMNz`), onder het team van Erwin Hauer.
- Framework: Next.js 16, geen `vercel.json`, geen cron, geen Edge-runtime, geen speciale regio-instelling in de repo. Standaardregio Vercel Functions is `iad1` (VS-oost); of dat is aangepast staat in het dashboard `[INVULLEN]`.
- Deploy: push naar `main` gaat naar Production, push naar `beta` naar een Preview met vast alias en eigen environment variables per branch.
- Het script `vercel-build` doet tijdens elke deploy drie dingen vóór de build: `supabase link` en `supabase db push` (migraties uitvoeren op de gekoppelde database), `node scripts/release-changelog.mjs` (schrijft een regel in `productchangelog`) en `next build`. **In Azure moeten deze stappen in de deploypijplijn terechtkomen**, in dezelfde volgorde, met toegang tot de database tijdens de pijplijn.
- Het project heeft geen Dockerfile en `next.config.ts` heeft geen `output: "standalone"`. Voor een container-deploy moet dat worden toegevoegd (klein werk).
- De proxy (`src/proxy.ts`, het Next.js 16-equivalent van middleware) ververst op elke request de Supabase-sessiecookie.

## 6. Authenticatie

Wat de app gebruikt, met bestand:

| Functie | Waar |
|---|---|
| Inloggen met e-mail en wachtwoord | `src/actions/auth.ts` (`signInWithPassword`) |
| Magic link | `src/actions/auth.ts` (`signInWithOtp`) |
| Wachtwoord vergeten | `src/actions/auth.ts` (`resetPasswordForEmail`) |
| Terugkeerpagina's | `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts` |
| Beheer: gebruiker aanmaken, wijzigen, verwijderen, uitnodigingslink | `src/actions/admin.ts` (`auth.admin.*`, `generateLink`) met de service-role-sleutel |

Aandachtspunten:

- Wachtwoorden staan als hash in `auth.users`. Door het `auth`-schema één-op-één te migreren blijven gebruikers-ID's en wachtwoorden behouden. Een eerder gebruikt script (`scripts/migrate-to-new-supabase.mjs`) maakte gebruikers opnieuw aan met nieuwe ID's en herschreef alle verwijzingen; dat is bij een schema-dump niet nodig en moet bij voorkeur worden vermeden.
- Alle sessies worden ongeldig bij de overgang (nieuwe JWT-sleutel). Gebruikers moeten één keer opnieuw inloggen.
- Auth stuurt e-mail (magic links, herstel, uitnodigingen). Welke afzender en welke SMTP-dienst nu worden gebruikt `[INVULLEN]`. In Azure is een SMTP-relay nodig, bijvoorbeeld Exchange Online SMTP of Azure Communication Services.
- Koppeling aan Entra ID: gepland als latere stap. Bij route A kan dat via de ingebouwde Azure/Entra-provider van GoTrue; gebruikers worden dan gekoppeld op e-mailadres.

## 7. Omgevingsvariabelen

Alleen de namen; waarden staan in Vercel en horen via een kluis (Azure Key Vault) in Azure te komen.

| Variabele | Gebruik | Openbaar in browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL van de Supabase-API | ja |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publieke API-sleutel | ja |
| `SUPABASE_SERVICE_ROLE_KEY` | beheeracties, omzeilt RLS | nee, strikt geheim |
| `SUPABASE_PROJECT_REF` | doelproject voor de migraties bij de build | nee |
| `SUPABASE_DB_PASSWORD` | databasewachtwoord voor `db push` bij de build | nee |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI-token | nee |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app, alleen lezen | nee |
| `PATRICIA_DB_HOST`, `_PORT`, `_NAME`, `_DOMAIN`, `_USER`, `_PASSWORD` | verbinding met Patricia (SQL Server, NTLM) | nee |

`NEXT_PUBLIC_*` wordt tijdens de build in de browserbundel gebakken: een wijziging van die waarden vraagt dus een nieuwe build, geen herstart.

## 8. Externe koppelingen

- **Patricia (SQL Server).** Uitgaande TCP-verbinding naar poort 1433 van de Patricia-server, authenticatie via NTLM met domein `knijff`. De code (`src/lib/patricia.ts`, `src/actions/patricia.ts`) staat op de branch `feature/patricia-koppeling` en voert alleen `SELECT`-queries uit: dossiernaam (catchword) en klantgegevens op dossiernummer. Er zijn meerdere databases op de Patricia-server; de applicatie gebruikt de database `Patricia`. Dit is precies de verbinding die op Vercel niet veilig te maken was, en de reden voor deze verhuizing. In Azure moet de app-server de Patricia-server intern kunnen bereiken (zelfde VNet of peering, NSG-regel voor poort 1433 alleen vanaf de app-subnet). Aanbevolen: een apart SQL-account met uitsluitend leesrechten op de benodigde tabellen (`VW_CASE_NUMBER`, `PAT_CASE`, `CASTING`, `ACTOR`), en NTLM vervangen door een Entra-gebaseerde of beheerde identiteit als de Patricia-server dat toestaat. Schema-onderzoek staat in `patricia_fields.md` (op die branch).
- **HubSpot.** Uitgaande HTTPS-verbinding naar `api.hubapi.com` met een private-app-token, alleen lezen. Code: `src/actions/hubspot.ts`. Geen inkomende verbinding nodig.
- **AccountView.** Geen koppeling.
- **E-mail.** Alleen via Supabase Auth, zie hoofdstuk 6. De app verstuurt zelf geen e-mail.

## 9. Netwerk, beveiliging en niet-functionele eisen

- Inkomend: HTTPS op een eigen domeinnaam; huidig productiedomein en DNS-beheer `[INVULLEN]`. Het domein moet bij overgang naar het Azure-adres kunnen wijzen; de TTL moet vooraf kunnen worden verlaagd.
- Uitgaand vanaf de app-server: Supabase-diensten (intern bij route A), HubSpot (internet), Patricia (intern), SMTP.
- Geheimen: service-role-sleutel, databasewachtwoord, HubSpot-token en Patricia-wachtwoord horen in Key Vault, niet in de repo of in `.env`-bestanden op de server.
- Data: de database bevat klantnamen, adressen, tarieven en werkzaamheden van een advocatenkantoor. Behandel elke kopie (ook voor test) als vertrouwelijk.
- Beschikbaarheid: huidige situatie is een enkele Vercel-omgeving en een enkele Supabase-instantie, zonder formele SLA-afspraak binnen Knijff. De gebruikersgroep is Knijff-intern; piekgebruik rond deadlines voor tijdschrijven en facturatie, geen 24/7-eis.
- Back-ups: dagelijks, geen point-in-time recovery. Azure Database for PostgreSQL biedt PITR standaard (7 tot 35 dagen); gebruik dat. Een proefherstel is in de huidige situatie nooit gedaan en is een punt voor de nieuwe omgeving.
- Logging en monitoring: nu alleen Vercel-logs en Supabase-logs. In Azure: Application Insights of Log Analytics voor de app, en de diagnostische logging van de database.

## 10. Eigenaarschap en toegang (op te schonen tijdens de verhuizing)

Bijna alles staat nu op persoonlijke of projectaccounts van Erwin Hauer. Dat moet bij de verhuizing naar Knijff-beheer:

- GitHub-repository `erwinhauer/chronos` is een persoonlijk account. Verplaats naar een organisatie van Knijff of naar Azure DevOps.
- Vercel-team en Supabase-organisatie (`wdfiivdxprswjfrxcmqr`) staan op Erwins account.
- De HubSpot private app en de Patricia-gebruiker zijn waarschijnlijk persoonlijk of via IT aangemaakt `[INVULLEN]`. Vervang ze door servicesaccounts die de beheerder beheert.

## 11. Wat de beheerder concreet kan inrichten

Een voorstel voor de Azure-resources, ter bespreking:

| Resource | Doel |
|---|---|
| Resourcegroep per omgeving (LIVE, BETA, TEST) | Scheiding, kostenoverzicht, rechten |
| Virtual Network met subnetten (app, database, Patricia) en NSG-regels | Veilig verkeer tussen app en Patricia |
| App-hosting: Azure Container Apps of App Service for Containers | Next.js (Node 20.9+ of nieuwer) |
| Supabase-diensten (route A): PostgREST, GoTrue, Storage-API, gateway | In dezelfde omgeving als de app |
| Azure Database for PostgreSQL Flexible Server | Database, met PITR |
| Azure Blob Storage (of volume voor de Storage-API) | Profielfoto's |
| Azure Key Vault | Geheimen |
| Azure Front Door of Application Gateway (met WAF) en een certificaat | Inkomend HTTPS op eigen domein |
| Container Registry en CI/CD (GitHub Actions of Azure DevOps) | Bouwen en uitrollen, inclusief databasemigraties |
| Application Insights en Log Analytics | Monitoring |
| Entra ID app-registratie | Voor de latere SSO-stap |

## 12. Invulveld voor wat alleen in de dashboards te zien is

Deze gegevens kunnen niet uit de repository worden gehaald. Ze zijn nodig voor de dimensionering en voor het verhuisplan.

Te vullen in het Supabase-dashboard (LIVE en BETA):

- [INVULLEN] Abonnement/plan en regio van het LIVE-project
- [INVULLEN] Grootte van de database (Settings, Database)
- [INVULLEN] Aantal rijen per tabel (query hieronder)
- [INVULLEN] Aantal gebruikers in Auth en het aantal actief in de laatste 30 dagen
- [INVULLEN] Aantal bestanden en totale grootte in Storage (`avatars`, en of `facturen` bestaat en leeg is)
- [INVULLEN] SMTP-instellingen en afzenderadres voor Auth-mail; exporteer de e-mailsjablonen (Auth, Email Templates)
- [INVULLEN] `site_url` en toegestane redirect-URL's
- [INVULLEN] Of er extra database-extensies, cronjobs, webhooks of Edge Functions in het dashboard zijn aangemaakt die niet in `supabase/migrations/` staan

Te vullen in het Vercel-dashboard:

- [INVULLEN] Abonnement (Hobby/Pro) en functieregio
- [INVULLEN] Productiedomein, extra domeinen en waar de DNS wordt beheerd
- [INVULLEN] Volledige lijst environment variables per omgeving (namen, niet de waarden)
- [INVULLEN] Gemiddeld verkeer en looptijd van de functies (Usage)

Query voor het aantal rijen en de grootte per tabel, uit te voeren in de SQL-editor van Supabase:

```sql
select relname as tabel,
       n_live_tup as rijen,
       pg_size_pretty(pg_total_relation_size(relid)) as grootte
from pg_stat_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc;
```

Query voor het aantal beleidsregels (policies) en bucket-inhoud:

```sql
select count(*) as policies from pg_policies where schemaname = 'public';
select b.id, b.public, count(o.id) as bestanden
from storage.buckets b left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public;
```

## 13. Bijlagen en verwijzingen in de repository

- `documentation.md`: actuele technische referentie (rollen, datamodel, berekeningen).
- `supabase/migrations/`: het volledige schema, 53 bestanden.
- `scripts/seed.mjs`: vult een lege omgeving met demodata (7 demogebruikers, 2 teams, 2 klanten); alleen voor TEST en BETA, nooit voor productie.
- `scripts/migrate-to-new-supabase.mjs`: eerder eenmalig migratiescript tussen twee Supabase-projecten; achtergrond, niet bruikbaar zonder aanpassing.
- `patricia.md`, `patricia_api.md`: onderzoek naar de Patricia-koppeling. Met de verhuizing naar Azure vervalt de noodzaak voor de interne API-laag uit `patricia_api.md`, omdat de app dan rechtstreeks en intern met Patricia kan praten.
- `livegang.md`: chronologische geschiedenis van releases en omgevingskeuzes.
