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

**Nog niet gedaan, en waarom dit bij jou moet liggen:**

- ⚠️ **Stap 6 (Deployment Protection)**: de beta-URL staat al niet publiek open — Vercel
  vraagt standaard een Vercel-login ("Vercel Authentication"). Dat beschermt tegen
  toevallige bezoekers, maar blokkeert ook je eigen betatesters als die geen
  Vercel-account hebben. Kies zelf in de Vercel-projectinstellingen (Settings →
  Deployment Protection) of je overschakelt naar "Password Protection" (gedeeld
  wachtwoord, praktischer voor externe testers) of testers als Vercel-teamlid toevoegt.
- ⚠️ **Stap 7 (backups)**: hangt af van het Supabase-abonnement van zowel het
  bestaande LIVE-project als het nieuwe Chronos Beta-project — dat moet je zelf
  checken/instellen in het Supabase-dashboard (Project Settings → Backups).
- ⚠️ **Stap 8 (foutregistratie)**: vereist een nieuw account bij een derde partij
  (bv. Sentry) — dat maak ik nooit zelf aan. Zodra je een account + DSN hebt, bouw ik
  de code-integratie.
- ⚠️ **Stap 9 (betatesters)**: wie precies wordt uitgenodigd is een keuze die alleen
  jij kunt maken; zodra je een lijst hebt, zet ik ze als Auth-gebruiker in Chronos Beta.

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
