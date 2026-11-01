# Patricia API/gateway — plan, nog niet gestart

*Status: planning-only, nog niets gebouwd. 2026-09-30.*

Dit is "Optie A" uit [`patricia.md`](patricia.md) §4 en de conceptmail aan IT: een
kleine, beveiligde interne API in plaats van Vercel Enterprise + Secure
Compute/VPN. Erwin neigt naar deze optie boven de VPN-route (waarschijnlijk goedkoper,
minder infrastructuur-drempel). Vastgelegd zodat dit niet opnieuw uitgezocht moet
worden zodra dit project wordt opgepakt.

## Waarom dit relatief snel te bouwen is

Het meeste voorwerk staat er al:

- [`patricia_fields.md`](patricia_fields.md) (op `feature/patricia-koppeling`) — de
  volledige, geverifieerde SQL-schema-research (tabellen, joins, rol-type-ID's).
- `src/lib/patricia.ts` (zelfde branch) — de werkende `mssql`-connectiecode en
  `zoekDossierInfo()`, die al precies de query's uitvoert die dit API'tje straks
  ook nodig heeft.

Dit hoeft dus niet opnieuw onderzocht te worden — alleen verpakt in een HTTP-laag
in plaats van rechtstreekse SQL-calls vanuit Chronos zelf.

## Voorgestelde vorm

Een klein, smal servicetje — geen generieke SQL-doorgeefluik, alleen specifieke,
narrow endpoints voor wat Chronos daadwerkelijk nodig heeft:

- `GET /dossier/:nummer` — dossiernaam + klantgegevens (naam, adres,
  Patricia-`ACTOR_ID`) — exact wat `zoekDossierInfo()` nu al doet.
- Later eventueel een billing-address-endpoint, zodra dat voor het facturatieplan
  (`plan-facturatie-vanuit-chronos.md` §5) nodig is.

Techniekkeuze niet vastgelegd — een klein Node/Express-servicetje is de voor de
hand liggende optie, een tweede Next.js-app kan ook als dat beter aansluit bij
wat IT kan beheren.

**Authenticatie**: een API-sleutel is de eenvoudigste optie; mutual TLS is
mogelijk als een sterkere variant, maar meer opzet.

**Wijziging aan Chronos-kant**: `src/lib/patricia.ts` verandert van "praat
rechtstreeks met SQL Server" naar "doe een `fetch` naar dit eindpunt" — een kleine,
overzichtelijke wijziging, geen herontwerp.

## Wat ik kan bouwen, en wat niet

- **Wel**: de code van het servicetje zelf (endpoints, SQL-queries hergebruiken,
  authenticatie).
- **Niet**: hosten of draaien. Dit moet ergens ín het Knijff-netwerk draaien (alleen
  daar is de SQL-verbinding naar Patricia mogelijk) en van daaruit een
  HTTPS-eindpunt naar buiten aanbieden. Dat is aan IT: waar het draait (bestaande
  server, VM, container) en hoe het naar buiten ontsloten wordt (reverse proxy,
  vast IP/domeinnaam).

## Kanttekening — beveiliging

Dit eindpunt is, hoe smal ook, een echt aanvalsoppervlak naar Patricia-data.
Verdient een kort beveiligingsgesprek met IT (authenticatie, rate limiting,
logging) vóór het live gaat — niet iets om er stilletjes bij te bouwen.

## Volgende stap, zodra dit wordt opgepakt

Eerst een kort plan (endpoints, authenticatiekeuze, wat concreet van IT nodig is)
vóór er code geschreven wordt — zelfde patroon als bij andere grotere stukken in
dit project.
