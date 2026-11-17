-- Meldingen: een beheerder plaatst een melding bovenin Chronos (storing, onderhoud, nieuws).
-- Drie soorten: info (groen), waarschuwing (oranje), urgent (rood). Een melding is wegklikbaar of
-- niet; wegklikken wordt per gebruiker bewaard, zodat de melding op elk apparaat weg blijft.

create type public.melding_soort as enum ('info', 'waarschuwing', 'urgent');

create table public.meldingen (
  id uuid primary key default gen_random_uuid(),
  soort public.melding_soort not null default 'info',
  tekst text not null check (char_length(btrim(tekst)) between 1 and 500),
  wegklikbaar boolean not null default true,
  actief boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_meldingen_updated_at before update on public.meldingen
  for each row execute function public.set_updated_at();

comment on table public.meldingen is 'Meldingen van een beheerder bovenin Chronos. Alleen actieve meldingen worden aan gebruikers getoond.';

create table public.melding_gesloten (
  melding_id uuid not null references public.meldingen (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  gesloten_op timestamptz not null default now(),
  primary key (melding_id, profile_id)
);

comment on table public.melding_gesloten is 'Welke gebruiker welke wegklikbare melding heeft weggeklikt.';

alter table public.meldingen enable row level security;
alter table public.melding_gesloten enable row level security;

-- Iedereen ziet de actieve meldingen; een beheerder ziet ze allemaal (om te beheren).
create policy "meldingen_select" on public.meldingen
  for select to authenticated
  using (public.is_active_user() and (actief or public.is_role('beheerder')));

create policy "meldingen_insert_beheerder" on public.meldingen
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "meldingen_update_beheerder" on public.meldingen
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

create policy "meldingen_delete_beheerder" on public.meldingen
  for delete to authenticated using (public.is_role('beheerder'));

-- Een gebruiker ziet en schrijft alleen zijn eigen "weggeklikt"-regels. Een beheerder kan ze wissen
-- (na het wijzigen van de tekst van een melding verschijnt die weer bij iedereen).
create policy "melding_gesloten_select_eigen" on public.melding_gesloten
  for select to authenticated using (profile_id = auth.uid());

create policy "melding_gesloten_insert_eigen" on public.melding_gesloten
  for insert to authenticated
  with check (profile_id = auth.uid() and public.is_active_user());

create policy "melding_gesloten_delete_beheerder" on public.melding_gesloten
  for delete to authenticated using (public.is_role('beheerder'));
