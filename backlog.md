# Backlog

Losse ideeën/features die nog niet zijn uitgewerkt of ingepland. Zie
`_backlog/Chronos - Backlog.docx` voor de oorspronkelijke, uitgebreidere backlog —
dit bestand is de lichte, git-gevolgde aanvulling daarop voor items die onderweg naar
boven komen.

- **Standaardproducten.** Standaard producten inbouwen in Chronos, met een vaste
  omschrijving en prijs, die je bij het aanmaken van een factuuritem kunt kiezen
  in plaats van omschrijving en tarief steeds handmatig in te typen. (2026-09-02)
- **Herkennen van werkzaamheden binnen een dossiertype.** Kan Chronos een aanvraag/
  verlenging binnen een TM- of D-dossier, of een specifieke mutatie binnen een
  C-dossier, herkennen/voorstellen? Hangt samen met Standaardproducten hierboven —
  ook relevant voor de AccountView-artikelcode-koppeling, zie
  `facturatie-accountview-mapping.md` §6. (2026-09-24)
- **Automatisch aanvullen van omschrijvingen** bij het aanmaken van een factuuritem.
  (2026-09-24)
- **Opmerking op een factuurregel zichtbaar maken in overzichten.** Onderscheid
  tussen "ter info" en een blokkerende opmerking; overwegen of een blokkerende
  opmerking een waarschuwing/popup moet tonen bij het aanmaken. (2026-09-24)
- **Dossiernummer kopiëren vanuit het factuuritems-overzicht.** De "Kopieer
  dossiernummers"-knop bestaat al op de specificatiepagina en de klantpagina, niet
  op de factuuritems-lijst/-detailpagina zelf. (2026-09-24)
- **Sessietimeout instellen** — voorstel 8 uur, nog te bepalen of dat de juiste
  duur is. (2026-09-24)
- **Magic Link met een code i.p.v. een link.** Alternatief op de bestaande
  Magic-Link-beperking (zie hieronder, e-maillimiet). (2026-09-24)
- **DSO (Days Sales Outstanding) meten, per periode** (Marcus) — vergt
  betaaldatum-registratie die Chronos vandaag nergens vastlegt; andere metric dan
  DWO (dat meet werk→specificatie, niet specificatie→betaling). (2026-09-24)
- **Documentatiegat: welke database draait waar (LIVE/BETA/localhost).**
  `documentation.md` beschrijft de omgevingen conceptueel, maar niet de concrete
  Supabase-projectreferenties — die moeten nog aangeleverd worden. (2026-09-24)
- **Volgende dashboard-iteratie: tile per medewerker** — uren deze maand
  (onderhanden + factuur gecombineerd) en fixed fee deze maand (idem), als
  mogelijke aanvulling op het dashboard-herontwerp van 2026-09-24. (2026-09-24)

**E-maillimiet Supabase (onderzocht 2026-09-24):** de standaard Supabase-mailer is
gelimiteerd tot 2 e-mails/uur per project (geen apart genoemde daglimiet), niet
planafhankelijk (Free en Pro gelijk) — Supabase noemt deze sender zelf
"best-effort", geen productie-SLA. Met een eigen SMTP-provider vervalt die limiet
en geldt een instelbare standaard van 30/uur. Relevant voor zowel de bestaande
Magic-Link-beperking als het toekomstige factuur-e-mailplan
(`plan-facturatie-vanuit-chronos.md` §6, waar Resend nu bevestigd is als gekozen
partij — zie hieronder).
Bronnen: [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits),
[Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
