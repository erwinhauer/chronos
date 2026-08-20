-- Chronos — nieuwe rol "directie": read-only toegang tot de financiële
-- dashboardinformatie van alle teams (naast de bestaande finance-rol).
-- Moet in een eigen migratie staan — Postgres laat een net toegevoegde
-- enum-waarde niet toe binnen dezelfde transactie waarin hij is aangemaakt.

alter type public.user_role add value 'directie';
