<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentatie bijhouden

`documentation.md` (root) is de actuele technische referentie van Chronos — geen
changelog. Werk het bij (niet alleen aanvullen, ook corrigeren wat niet meer klopt)
zodra een feature/optimalisatie naar LIVE gaat, in dezelfde beweging als de
`livegang.md`-entry. `manual.md`/de in-app Handleiding zijn gebruikersgericht en apart.

# Changelog en versienummer bijhouden

De in-app changelog (Instellingen > Changelog) en het versienummer onderaan de zijbalk komen
uit `scripts/release-changelog.mjs` (draait in `vercel-build`). Bij **elke** wijziging die naar
`beta` gaat, in dezelfde commit:

1. Voeg in `scripts/release-changelog.mjs` een NIEUWE release-entry toe (nieuw versienummer,
   releasedatum van vandaag, gebruikersgerichte tekst in het Nederlands) en zet hem achteraan
   in `CHANGELOG_ENTRIES`. Een bestaande entry aanpassen werkt niet: die staat dan al in de
   database. Nieuwe functie of optimalisatie is minor (1.3.0 naar 1.4.0), alleen bugfixes is
   patch (1.3.0 naar 1.3.1).
2. Zet `package.json` `"version"` op hetzelfde nummer (de build faalt als ze afwijken).
3. Draai `npm run check:changelog` vóór het pushen; het script faalt als er app-code of
   migraties zijn gewijzigd zonder nieuwe changelog-entry en versieverhoging.

Bij promotie van `beta` naar `main` hoeft er niets extra's: LIVE haalt alle ontbrekende entries
in één keer in tijdens de build. Dit hoort bij het "klaar"-lijstje van elke wijziging, naast de
`livegang.md`-entry en `documentation.md`.

# Bredere Erwin/Knijff-context

Erwins persoonlijke werkstijl en Knijffs zakelijke context (diensten, positionering,
systemen incl. Chronos zelf, waarden, AI-werkregels) staan globaal in
`~/.claude/CLAUDE.md` + `~/.claude/context/*.md` — geldt project-overstijgend, hier
niet gedupliceerd.
