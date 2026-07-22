# Chronos

Uren- en facturatieportal van Knijff. Zie `Voorstel_MVP_1.0_Uren_en_facturatieportal_Knijff.docx` (op het Bureaublad) voor de volledige scope en fasering.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI) + Supabase (Postgres, Auth, RLS). Lettertype: Inter.

## Lokaal draaien

Vereist: Node.js, Docker (voor de lokale Supabase-stack).

```bash
npm install
npx supabase start   # start lokale Postgres/Auth/Storage; print de lokale keys
npm run seed          # vult demo-gebruikers, klanten en dossiers
npm run dev           # start Next.js op http://localhost:3000
```

`.env.local` bevat al de vaste lokale Supabase-keys uit `supabase start` — bij een `supabase db reset` blijven deze gelijk.

Demo-inloggegevens (lokaal, wachtwoord `Chronos2026!`):

| E-mail | Rol |
| --- | --- |
| vera.vermeer@chronos.local | Medewerker |
| anna.aerts@chronos.local | Medewerker |
| lucas.berg@chronos.local | Medewerker |
| tom.teunissen@chronos.local | Teamleider |
| fatima.faber@chronos.local | Finance |
| bram.beheer@chronos.local | Beheerder |

## Databasewijzigingen

Nieuwe migratie toevoegen:

```bash
npx supabase migration new <naam>
# SQL schrijven in supabase/migrations/..., dan:
npx supabase db reset   # herbouwt lokale DB met alle migrations
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Structuur

- `supabase/migrations/` — schema, RLS-policies en de generieke audit-trigger (`write_auditlog`), gebaseerd op de briefing (§5 Gegevensmodel, §14 Auditlog, Bijlage A).
- `src/lib/supabase/` — server/browser Supabase-clients, middleware voor sessie/route-protectie, gegenereerde database-types.
- `src/actions/` — server actions (auth, dossiers).
- `src/app/(app)/` — geauthenticeerde schermen (dashboard, klanten, dossiers), achter de layout die rol ophaalt en niet-ingelogde gebruikers naar `/login` stuurt.
- `src/components/` — app-shell/navigatie en Chronos-specifieke componenten; `src/components/ui/` zijn de shadcn/ui-primitieven.

## Status

Fase 1 (Fundament) uit het MVP-voorstel: authenticatie, rollen/RLS, klant- en dossierbeheer. Registratie van uren/kosten, goedkeuringsworkflow, facturatiebatches en specificaties volgen in latere fasen.
