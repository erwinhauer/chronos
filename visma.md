# Visma.net: haalbaarheid koppeling met Chronos

Analyse van 2026-10-29. Gebaseerd op de online documentatie en de officiële OpenAPI-specificatie van de Financials-API (399 endpoints). Er is nog niets live aangeroepen: daarvoor is een demo-tenant nodig. Alles hieronder is dus "volgens de documentatie", niet getest.

## Doel

Chronos verstuurt geen facturen meer. Chronos stuurt de factuurvoorstellen (de specificaties) naar Visma.net. Finance (of een dedicated team) controleert ze daar, geeft ze vrij en verstuurt de facturen.

## Conclusie

Dit kan met de Visma.net API. Aanbevolen is een concept-klantfactuur met de specificatie als bijlage.

## Aanbevolen aanpak

1. Chronos maakt per factuurvoorstel een klantfactuur aan met `POST https://api.finance.visma.net/v1/customerinvoice` en zet `hold: true`. De factuur staat dan als concept klaar. Chronos roept de actie `release` nooit aan, dat doet Finance in Visma.
2. Velden die Chronos kan meegeven:
   - header: `customerNumber`, `documentDate`, `currencyId`, `invoiceText`, `note`, `customerRefNumber` (bijvoorbeeld PO-nummer), `project`, `branchNumber`, `externalReference` (het Chronos-batch-id), `documentDueDate`, `creditTermsId`, `customerVatZoneId`, `dontPrint`, `dontEmail`
   - regels (`invoiceLines`): `description`, `quantity`, `uom`, `unitPriceInCurrency`, `accountNumber`, `vatCodeId`, `discountPercent`, `discountAmountInCurrency`, `taskId`, `startDate`, `endDate`, `note`
3. De specificatie (PDF uit Chronos) gaat als bijlage mee met `POST /v1/customerinvoice/{invoiceNumber}/attachment`. Dat is een multipart/form-data upload met een `file`-deel en optioneel een `metadata`-deel, bijvoorbeeld `{"includeAttachmentInvoiceEmail": true}` om de bijlage mee te sturen met de factuurmail.
4. Terugkoppeling naar Chronos:
   - `GET /v1/customerinvoice` filtert op `externalReference`, `status`, `released`, `customer`, `project`, `documentDate`, `lastModifiedDateTime` en meer.
   - Webhooks via het Visma Developer Portal: AR Invoice `Changed` (aangemaakt of gewijzigd) en `Status Changed`. Er is geen aparte "released"- of "paid"-event gedocumenteerd.
5. Dubbel aanmaken voorkomen: eerst zoeken op `externalReference`, dan pas aanmaken. Er is geen idempotency-sleutel.

Alternatief: verkooporders (`/v2/salesorder`, actie `prepareInvoice`). Afgeraden: zwaarder, en alleen zinvol als Knijff de orderfunctie van Visma gaat gebruiken.

Lange aanroepen kunnen via de header `erp-api-background` asynchroon (antwoord 202).

## Authenticatie en toegang

- Machine-naar-machine via de client credentials flow. Token via `https://connect.visma.com/connect/token`, een uur geldig. Parameters: `grant_type=client_credentials`, `scope` (bijvoorbeeld `visma_api:read`; de schrijfscope is niet in de documentatie gevonden en moet worden nagevraagd), `client_id`, `client_secret` en optioneel `tenant_id`.
- Het gebruik van `tenant_id` vereist toestemming van een tenant-beheerder.
- De API-gebruiker heeft in Visma Admin de rol "API User" nodig.
- Het gratis Integrator Programme geeft toegang tot de documentatie en een demo-omgeving. Het betaalde ISV-programma lijkt alleen nodig om een app in de App Store te zetten. Dat is een conclusie, niet bevestigd.
- Er is ook een Visma Net MCP-server (`https://mcp.finance.visma.net/mcp`) voor AI-assistenten. Niet relevant voor deze koppeling.

## Klanten en projecten

- `GET /v1/customer` filtert op naam, KvK-nummer (`corporateId`), btw-nummer, e-mail, status en wijzigingsdatum. Niet op een eigen referentie. Er is dus een koppeling nodig tussen Chronos-klant (of Patricia-id) en Visma-klantnummer.
- Opties: het Visma-klantnummer gelijk houden aan het Patricia-nummer (de `POST /v1/customer` accepteert een eigen `number`), of het Visma-nummer per klant in Chronos opslaan.
- Projecten bestaan (`/v1/project`, `/v1/projecttask`), maar zijn alleen nodig als Finance projectadministratie in Visma gebruikt.

## Wat nog niet zeker is

- Bijlagen: een oudere melding in het Visma-communityforum zegt dat bijlagen bij klantfacturen via de API soms niet in de gebruikersinterface verschenen. Eerste punt om in de demo-omgeving te testen, want de specificatie is het product.
- Rate limit: de documentatie noemt alleen "X requests per hour per bedrijf en client", zonder getal. Bij overschrijding komt een 429 met `Retry-After`. Navragen bij Visma.
- Of `externalReference` unieke waarden afdwingt.
- Of vrijgave of betaling een webhook afvuurt. Terugval: periodiek pollen op `lastModifiedDateTime`.
- Welke OAuth-scopes nodig zijn voor schrijven.
- De documentatie noemt geen kosten voor API-gebruik. Navragen bij Visma of de leverancier.

## Gevolgen voor Chronos en eerdere plannen

- Chronos hoeft geen factuurnummers, mailen, factuur-PDF's of crediteren te beheren. Dat verdwijnt naar Visma.
- De statussen `batch_goedgekeurd` en `geexporteerd` in het schema zijn bruikbaar voor "klaargezet in Visma".
- Het AccountView-plan (`plan-facturatie-vanuit-chronos.md`, `facturatie-accountview-mapping.md`) valt grotendeels weg als Visma doorgaat. De open vraag "heeft AccountView een bruikbare API?" vervalt dan.
- Open keuzes voor Knijff:
  - een regel per factuuritem of samengevoegd per dossier
  - de koppeling van grootboekrekeningen en btw-codes aan Chronos-productgroepen
  - wie de btw-bepaling doet: Chronos of Finance bij het controleren
  - Visma-klantnummer gelijk aan Patricia-nummer of apart opslaan
- Credit-notes blijven buiten Chronos (nu AccountView, straks Visma).

## Voorgestelde volgende stap

1. Aan Visma of een leverancier een demo-tenant en een Integrator-account vragen.
2. Een korte proef bouwen: één concept-factuur met drie regels en een bijlage aanmaken, teruglezen en in de Visma-interface controleren.
3. De proef moet de bijlage-vraag, de `externalReference`-vraag en de benodigde scopes beantwoorden, voordat er iets in Chronos wordt gebouwd.

## Bronnen

- Documentatie: https://docs.vismasoftware.no/vismanetapi/
- Authenticatie: https://docs.vismasoftware.no/vismanetapi/authentication/
- Service integrations: https://docs.vismasoftware.no/vismanetapi/authentication/application-registration/service-integrations/index.md
- Customer invoice: https://docs.vismasoftware.no/vismanetapi/examples/customerledgerendpoint/customerinvoice/index.md
- Attachments: https://docs.vismasoftware.no/vismanetapi/api-reference/features/attachment/index.md
- Rate limits: https://docs.vismasoftware.no/vismanetapi/api-reference/rate-limits/index.md
- Webhook-events: https://docs.vismasoftware.no/vismanetapi/webhooks/event-and-entities/index.md
- Getting started: https://docs.vismasoftware.no/vismanetapi/introduction/getting-started-with-visma-net-api/index.md
- Swagger Financials-API: https://api.finance.visma.net/API-index/index.html (specificatie: `https://api.finance.visma.net/API-index/api/vismanet.erp.service.api-apim`)
