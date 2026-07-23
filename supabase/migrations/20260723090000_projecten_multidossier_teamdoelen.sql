-- Chronos — ronde 3: projecten per klant (met PO-nummer, hard gescoped bij
-- factureren), meerdere dossiernummers per factuuritem (child-tabel i.p.v.
-- scalar kolommen), teamdoelen per jaar, medewerker-initialen, en klant
-- subtitel/opmerkingen.

-- ---------------------------------------------------------------------------
-- Klant: subtitel + interne opmerkingen
-- ---------------------------------------------------------------------------

alter table public.klanten add column subtitel text;
alter table public.klanten add column opmerkingen text;

-- ---------------------------------------------------------------------------
-- Projecten per klant (0..n), elk met eigen PO-nummer.
-- ---------------------------------------------------------------------------

create table public.projecten (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten (id) on delete cascade,
  naam text not null,
  po_nummer text,
  actief boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projecten_klant on public.projecten (klant_id);

alter table public.projecten enable row level security;

create policy "projecten_select_authenticated" on public.projecten
  for select to authenticated using (public.is_active_user());

create policy "projecten_write_beheerder" on public.projecten
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "projecten_update_beheerder" on public.projecten
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

grant all on public.projecten to anon, authenticated, service_role;

create trigger trg_projecten_updated_at
  before update on public.projecten
  for each row execute function public.set_updated_at();

-- Factuuritems: optionele koppeling aan een project (voor facturatiescope).
alter table public.factuuritems add column project_id uuid references public.projecten (id);

-- Facturatiebatches: het project waarop deze factuur betrekking heeft
-- (voor PO-nummer op de specificatie).
alter table public.facturatiebatches add column project_id uuid references public.projecten (id);

-- ---------------------------------------------------------------------------
-- Meerdere dossiernummers per factuuritem: één regel (aantal/honorarium/
-- kosten) kan meerdere dossiers dekken (bv. één herinneringsactie voor
-- meerdere merkdossiers). Vervangt de scalar dossiernummer/type_dienst/land-
-- kolommen op factuuritems.
-- ---------------------------------------------------------------------------

create table public.factuuritem_dossiers (
  id uuid primary key default gen_random_uuid(),
  factuuritem_id uuid not null references public.factuuritems (id) on delete cascade,
  dossiernummer text not null,
  type_dienst text,
  land text,
  volgorde smallint not null default 0,
  created_at timestamptz not null default now()
);
create index idx_factuuritem_dossiers_item on public.factuuritem_dossiers (factuuritem_id);

alter table public.factuuritem_dossiers enable row level security;

-- Leesscope erft van de parent-rij: RLS op factuuritems geldt ook binnen
-- deze subquery, dus dit volgt automatisch team/rol-scope zonder duplicatie.
create policy "factuuritem_dossiers_select_scope" on public.factuuritem_dossiers
  for select to authenticated using (
    exists (select 1 from public.factuuritems fi where fi.id = factuuritem_dossiers.factuuritem_id)
  );

create policy "factuuritem_dossiers_write_via_parent" on public.factuuritem_dossiers
  for all to authenticated using (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (fi.medewerker_id = auth.uid() or public.is_role('finance') or public.is_role('beheerder'))
        and fi.status = 'aangemaakt'
    )
  ) with check (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (fi.medewerker_id = auth.uid() or public.is_role('finance') or public.is_role('beheerder'))
    )
  );

grant all on public.factuuritem_dossiers to anon, authenticated, service_role;

-- Backfill: bestaande dossiernummer/type_dienst/land per factuuritem naar de
-- child-tabel, dan de kolommen op factuuritems weg.
insert into public.factuuritem_dossiers (factuuritem_id, dossiernummer, type_dienst, land, volgorde)
  select id, dossiernummer, type_dienst, land, 0 from public.factuuritems;

alter table public.factuuritems drop column dossiernummer;
alter table public.factuuritems drop column type_dienst;
alter table public.factuuritems drop column land;

comment on table public.factuuritem_dossiers is 'Eén of meer dossiernummers per factuuritem; aantal/honorarium/kosten blijven op de parent-rij.';

-- ---------------------------------------------------------------------------
-- Teamdoelen: één jaardoel per team, met voortgang op het dashboard.
-- ---------------------------------------------------------------------------

create table public.teamdoelen (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  jaar integer not null,
  bedrag numeric(12, 2) not null check (bedrag >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, jaar)
);

alter table public.teamdoelen enable row level security;

create policy "teamdoelen_select_authenticated" on public.teamdoelen
  for select to authenticated using (public.is_active_user());

create policy "teamdoelen_write_beheerder" on public.teamdoelen
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "teamdoelen_update_beheerder" on public.teamdoelen
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

grant all on public.teamdoelen to anon, authenticated, service_role;

create trigger trg_teamdoelen_updated_at
  before update on public.teamdoelen
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Medewerker-initialen: max 3 tekens, admin-bewerkbaar. Blijft null totdat
-- iemand het instelt; de UI toont dan een client-side voorstel.
-- ---------------------------------------------------------------------------

alter table public.profiles add column initialen text;
alter table public.profiles add constraint profiles_initialen_check
  check (initialen is null or char_length(initialen) <= 3);
