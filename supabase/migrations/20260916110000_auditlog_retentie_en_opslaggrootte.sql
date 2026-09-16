-- Auditlog is nu beheerder-only leesbaar (RLS-policy bestond al), maar had nog
-- geen retentie en geen scherm om 'm te bekijken. Dit stuk regelt de retentie
-- (60 dagen) en een functie om de opslaggrootte te tonen; het scherm zelf komt
-- in de app (Instellingen > Auditlog).
create extension if not exists pg_cron;

-- cron.schedule is idempotent op de job-naam (upsert) — opnieuw draaien van
-- deze migratie maakt dus geen dubbele job aan.
select cron.schedule(
  'auditlog-retentie-60-dagen',
  '0 3 * * *',
  $$delete from public.auditlog where created_at < now() - interval '60 days'$$
);

-- Alleen een beheerder krijgt de werkelijke grootte terug; voor iedereen
-- anders null, zodat deze functie zonder extra check vanuit de client
-- aanroepbaar is zonder tabelgroottes van andere (evt. gevoelige) tabellen
-- bloot te geven.
create function public.auditlog_opslaggrootte()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_role('beheerder') then pg_total_relation_size('public.auditlog') end;
$$;

grant execute on function public.auditlog_opslaggrootte() to authenticated;
