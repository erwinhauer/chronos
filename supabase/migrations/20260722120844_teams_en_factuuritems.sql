-- Chronos — teams, klant-contactpersoon, en Registraties → Factuuritems
-- Verwerkt build-feedback: teams/gebruikersscope, dossier wordt vrije tekst op het
-- factuuritem (Type Dienst + land afgeleid uit het dossiernummer), Dossiers-tabel vervalt.

-- ============================================================================
-- teams + team_members (many-to-many; een gebruiker kan bij meerdere teams horen)
-- ============================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  naam text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teams is 'Teams voor zichtbaarheidsscope: gebruikers zien hun eigen items en die van teamgenoten.';

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

comment on table public.team_members is 'Lidmaatschap teams; many-to-many, een gebruiker kan in meerdere teams zitten.';

create trigger trg_teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

grant all on public.teams to anon, authenticated, service_role;
grant all on public.team_members to anon, authenticated, service_role;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "teams_select_authenticated" on public.teams
  for select to authenticated using (public.is_active_user());

create policy "teams_write_beheerder" on public.teams
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "teams_update_beheerder" on public.teams
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

create policy "teams_delete_beheerder" on public.teams
  for delete to authenticated using (public.is_role('beheerder'));

create policy "team_members_select_authenticated" on public.team_members
  for select to authenticated using (public.is_active_user());

create policy "team_members_write_beheerder" on public.team_members
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "team_members_delete_beheerder" on public.team_members
  for delete to authenticated using (public.is_role('beheerder'));

-- Helper: deelt de ingelogde gebruiker een team met target_profile? (security definer,
-- zodat dit ook binnen RLS-policies van andere tabellen gebruikt kan worden.)
create function public.shares_team_with(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm1
    join public.team_members tm2 on tm1.team_id = tm2.team_id
    where tm1.profile_id = auth.uid() and tm2.profile_id = target_profile
  );
$$;

-- ============================================================================
-- klanten: contactpersoon (naam) — contact_email, specificatietaal en
-- kantoorkosten_actief/percentage bestonden al.
-- ============================================================================

alter table public.klanten add column contactpersoon_naam text;

-- ============================================================================
-- productchangelog: versienummer is uniek (standaardconventie, geen duplicaten).
-- ============================================================================

alter table public.productchangelog add constraint productchangelog_versienummer_key unique (versienummer);

-- ============================================================================
-- registraties → factuuritems: dossier wordt vrije tekst + afgeleide velden,
-- Dossiers-tabel vervalt volledig.
-- ============================================================================

alter table public.registraties rename to factuuritems;
alter type registratie_status rename to factuuritem_status;

-- Onderliggende constraint-namen renamen: laat het staan bij "registraties_..."
-- en de nieuwe FK naar profiles (laatst_bewerkt_door) maakt de impliciete
-- PostgREST-join op profiles ambigu ("more than one relationship found").
alter table public.factuuritems rename constraint registraties_pkey to factuuritems_pkey;
alter table public.factuuritems rename constraint registraties_klant_id_fkey to factuuritems_klant_id_fkey;
alter table public.factuuritems rename constraint registraties_medewerker_id_fkey to factuuritems_medewerker_id_fkey;
alter table public.factuuritems rename constraint registraties_facturatiebatch_id_fkey to factuuritems_facturatiebatch_id_fkey;
alter table public.factuuritems rename constraint registraties_check to factuuritems_korting_check;
alter table public.factuuritems rename constraint registraties_check1 to factuuritems_terugstuur_reden_check;
alter table public.factuuritems rename constraint registraties_qty_check to factuuritems_qty_check;

alter policy "registraties_insert_eigen" on public.factuuritems rename to "factuuritems_insert_eigen";
alter policy "registraties_update_medewerker_concept" on public.factuuritems rename to "factuuritems_update_medewerker_concept";
alter policy "registraties_update_finance_beheerder" on public.factuuritems rename to "factuuritems_update_finance_beheerder";

-- Oude teamleider-goedkeuring liep via dossiers.teamleider_id; die keuring bestond
-- nog nergens in de UI en het dossierbegrip vervalt, dus deze policy vervalt.
drop policy "registraties_update_teamleider_goedkeuring" on public.factuuritems;
drop policy "registraties_select_scope" on public.factuuritems;

create policy "factuuritems_select_scope" on public.factuuritems
  for select to authenticated using (
    public.is_active_user() and (
      medewerker_id = auth.uid()
      or public.is_role('finance')
      or public.is_role('beheerder')
      or public.shares_team_with(medewerker_id)
    )
  );

alter index idx_registraties_medewerker rename to idx_factuuritems_medewerker;
alter index idx_registraties_klant rename to idx_factuuritems_klant;
alter index idx_registraties_batch rename to idx_factuuritems_batch;

alter trigger trg_registraties_updated_at on public.factuuritems rename to trg_factuuritems_updated_at;
alter trigger trg_audit_registraties on public.factuuritems rename to trg_audit_factuuritems;

-- Dossier_id-kolom (en de eraan gekoppelde index/FK) weg, dan de Dossiers-tabel zelf.
alter table public.factuuritems drop column dossier_id;
drop table public.dossiers cascade;

-- Default alleen om bestaande rijen (bv. testdata) te backfillen; direct
-- daarna weer verwijderd zodat nieuwe inserts altijd een echte waarde nodig hebben.
alter table public.factuuritems
  add column dossiernummer text not null default 'ONBEKEND00',
  add column type_dienst text,
  add column land text,
  add column laatst_bewerkt_door uuid references public.profiles (id);

alter table public.factuuritems alter column dossiernummer drop default;

comment on table public.factuuritems is 'Kernregistratie van werkzaamheden/uren/kosten, ofwel "factuuritems". Regelbedrag = honorarium + externe_kosten - korting. Dossiernummer is vrije tekst; type_dienst en land worden hieruit afgeleid (zie src/lib/dossiernummer.ts) en server-side gevalideerd.';
comment on column public.factuuritems.dossiernummer is 'Vrij tekstveld, bv. TM93905GB00. Opbouw: prefix (dienst-type) + nummer + 2-letterige landcode + suffix.';
comment on column public.factuuritems.type_dienst is 'Afgeleid uit het prefix van dossiernummer (bv. TM = Merken, O = Opposities).';
comment on column public.factuuritems.land is 'Afgeleid uit de 2-letterige landcode in dossiernummer.';
comment on column public.factuuritems.laatst_bewerkt_door is 'Wie de laatste wijziging deed, automatisch gezet door trg_factuuritems_laatst_bewerkt_door.';

create function public.set_laatst_bewerkt_door()
returns trigger
language plpgsql
as $$
begin
  new.laatst_bewerkt_door = auth.uid();
  return new;
end;
$$;

create trigger trg_factuuritems_laatst_bewerkt_door before update on public.factuuritems
  for each row execute function public.set_laatst_bewerkt_door();
