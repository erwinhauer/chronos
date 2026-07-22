-- Chronos — initieel datamodel
-- Gebaseerd op briefing "Uren- en facturatieportal" v1.0 (21 juli 2026), §5 Gegevensmodel en Bijlage A.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================

create type user_role as enum ('medewerker', 'teamleider', 'finance', 'beheerder');

create type klant_status as enum ('actief', 'inactief');

create type specificatietaal as enum ('nl', 'en');

create type specificatietype as enum ('simple', 'extended');

create type registratie_status as enum (
  'concept',
  'ingediend',
  'teruggestuurd',
  'goedgekeurd',
  'in_conceptbatch',
  'batch_goedgekeurd',
  'geexporteerd',
  'gefactureerd',
  'gecorrigeerd'
);

create type batch_status as enum (
  'concept',
  'batch_goedgekeurd',
  'geexporteerd',
  'gefactureerd'
);

create type audit_actie as enum (
  'aanmaken', 'wijzigen', 'indienen', 'goedkeuren', 'terugsturen',
  'exporteren', 'vergrendelen', 'heropenen', 'corrigeren'
);

-- ============================================================================
-- profiles — gekoppeld aan auth.users, draagt de rol (BR: rolgebaseerde autorisatie)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'medewerker',
  actief boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Interne gebruikers van de portal, 1:1 met auth.users, met rol voor autorisatie.';

-- ============================================================================
-- klanten (briefing §5.1)
-- ============================================================================

create table public.klanten (
  id uuid primary key default gen_random_uuid(),
  hubspot_id text unique,
  patricia_id text,
  accountview_debiteurnummer text,
  naam text not null,
  juridische_naam text,
  adres text,
  contact_email text,
  specificatietaal specificatietaal not null default 'nl',
  specificatietype specificatietype not null default 'simple',
  kantoorkosten_actief boolean not null default true,
  kantoorkosten_percentage numeric(5, 2) not null default 6.00,
  kolom_persoon_zichtbaar boolean not null default false,
  kolom_uren_zichtbaar boolean not null default false,
  kolom_tarief_zichtbaar boolean not null default true,
  kolom_externe_kosten_zichtbaar boolean not null default false,
  kolom_korting_zichtbaar boolean not null default false,
  kolom_matter_type_land_zichtbaar boolean not null default true,
  kolom_klantreferentie_zichtbaar boolean not null default false,
  standaard_teamleider_id uuid references public.profiles (id),
  valuta text not null default 'EUR',
  status klant_status not null default 'actief',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.klanten is 'Klanten (BR-01: elk dossier hoort bij precies één klant). Bron: HubSpot / Patricia, hier gecached met interne ID.';
comment on column public.klanten.kolom_externe_kosten_zichtbaar is 'Standaard aan voor Extended-specificatie, per klant instelbaar (§9.3).';
comment on column public.klanten.kolom_korting_zichtbaar is 'Standaard aan voor Extended-specificatie, per klant instelbaar (§9.3).';

-- ============================================================================
-- dossiers (briefing §5.2)
-- ============================================================================

create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  dossiernummer text not null,
  klant_id uuid not null references public.klanten (id),
  matter_naam text,
  matter_type text,
  land text,
  verantwoordelijke_id uuid references public.profiles (id),
  teamleider_id uuid references public.profiles (id),
  status klant_status not null default 'actief',
  bron text not null default 'portal' check (bron in ('patricia', 'portal')),
  externe_klantreferentie text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (klant_id, dossiernummer)
);

comment on table public.dossiers is 'Dossiers, bestaand (Patricia) of handmatig aangemaakt door een medewerker (BR-01).';

-- ============================================================================
-- tarieven (briefing §7.1 — prioriteit klant+medewerker > medewerker > klant > algemeen)
-- ============================================================================

create table public.tarieven (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid references public.klanten (id),
  medewerker_id uuid references public.profiles (id),
  tarief numeric(10, 2) not null check (tarief >= 0),
  ingangsdatum date not null,
  einddatum date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  check (einddatum is null or einddatum >= ingangsdatum)
);

comment on table public.tarieven is 'Tarieven per combinatie klant/medewerker met ingangs- en einddatum (BR-03). Een tariefwijziging raakt nooit bestaande registraties.';

create index idx_tarieven_klant_medewerker on public.tarieven (klant_id, medewerker_id, ingangsdatum);

-- ============================================================================
-- registraties (briefing §5.3, §6, §8.1)
-- ============================================================================

create table public.facturatiebatches (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten (id),
  periode_start date not null,
  periode_eind date not null,
  valuta text not null default 'EUR',
  status batch_status not null default 'concept',
  accountview_factuurnummer text,
  accountview_factuurdatum date,
  totaal_honorarium numeric(12, 2) not null default 0,
  totaal_externe_kosten numeric(12, 2) not null default 0,
  totaal_korting numeric(12, 2) not null default 0,
  totaal_kantoorkosten numeric(12, 2) not null default 0,
  totaal_bedrag numeric(12, 2) not null default 0,
  goedgekeurd_door uuid references public.profiles (id),
  goedgekeurd_op timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (periode_eind >= periode_start)
);

comment on table public.facturatiebatches is 'Eén klant, één valuta, één factuur per batch (§8.3).';

create table public.registraties (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers (id),
  klant_id uuid not null references public.klanten (id),
  medewerker_id uuid not null references public.profiles (id),
  datum date not null,
  omschrijving_klant text not null,
  interne_opmerking text,
  eenheidstype text not null default 'uren',
  qty numeric(10, 1) not null check (qty >= 0),
  tarief numeric(10, 2),
  tarief_afwijkend boolean not null default false,
  honorarium numeric(10, 2) not null default 0,
  externe_kosten numeric(10, 2) not null default 0,
  korting numeric(10, 2) not null default 0,
  kantoorkosten_van_toepassing boolean not null default true,
  declarabel boolean not null default true,
  status registratie_status not null default 'concept',
  terugstuur_reden text,
  facturatiebatch_id uuid references public.facturatiebatches (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- BR-05: per regel maximaal één vaste korting, en korting mag honorarium + externe kosten niet overschrijden
  check (korting <= honorarium + externe_kosten),
  -- Verplichte reden bij terugsturen
  check (status <> 'teruggestuurd' or terugstuur_reden is not null)
);

comment on table public.registraties is 'Kernregistratie van werkzaamheden/uren/kosten (BR-02 t/m BR-08). Regelbedrag = honorarium + externe_kosten - korting.';

create index idx_registraties_medewerker on public.registraties (medewerker_id, status);
create index idx_registraties_dossier on public.registraties (dossier_id);
create index idx_registraties_klant on public.registraties (klant_id, status);
create index idx_registraties_batch on public.registraties (facturatiebatch_id);

-- BR-13: een registratie mag niet tegelijk in twee actieve batches staan — geborgd doordat
-- facturatiebatch_id een single FK is (1 batch per moment) en alleen gezet mag worden vanuit 'goedgekeurd'.

-- ============================================================================
-- specificaties (briefing §9)
-- ============================================================================

create table public.specificaties (
  id uuid primary key default gen_random_uuid(),
  facturatiebatch_id uuid not null references public.facturatiebatches (id),
  type specificatietype not null,
  taal specificatietaal not null,
  versie int not null default 1,
  pdf_storage_path text,
  vergrendeld boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.specificaties is 'Gegenereerde Simple/Extended specificaties per batch. Vergrendeld = definitief, niet ongemerkt overschrijfbaar (BR-15).';

-- ============================================================================
-- auditlog (briefing §14.1) — technisch onveranderbaar
-- ============================================================================

create table public.auditlog (
  id uuid primary key default gen_random_uuid(),
  gebruiker_id uuid references public.profiles (id),
  actie audit_actie not null,
  object_type text not null,
  object_id uuid,
  oude_waarde jsonb,
  nieuwe_waarde jsonb,
  reden text,
  created_at timestamptz not null default now()
);

comment on table public.auditlog is 'Append-only logboek van wijzigingen in bedrijfsdata (§14.1). Reguliere gebruikers mogen dit nooit wijzigen of verwijderen.';

create index idx_auditlog_object on public.auditlog (object_type, object_id);
create index idx_auditlog_gebruiker on public.auditlog (gebruiker_id, created_at);

-- ============================================================================
-- productchangelog (briefing §14.2)
-- ============================================================================

create table public.productchangelog (
  id uuid primary key default gen_random_uuid(),
  versienummer text not null,
  releasedatum date not null,
  titel text not null,
  nieuwe_functies text[] not null default '{}',
  wijzigingen text[] not null default '{}',
  bugfixes text[] not null default '{}',
  bekende_beperkingen text[] not null default '{}',
  gebruikersactie text,
  technische_referenties text[] not null default '{}',
  zichtbaarheid text not null default 'alle' check (zichtbaarheid in ('alle', 'beheerders', 'eenmalig')),
  created_at timestamptz not null default now()
);

comment on table public.productchangelog is 'Changelog van software-releases (§14.2), niet te verwarren met de auditlog van gebruikershandelingen.';

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_klanten_updated_at before update on public.klanten
  for each row execute function public.set_updated_at();
create trigger trg_dossiers_updated_at before update on public.dossiers
  for each row execute function public.set_updated_at();
create trigger trg_registraties_updated_at before update on public.registraties
  for each row execute function public.set_updated_at();
create trigger trg_batches_updated_at before update on public.facturatiebatches
  for each row execute function public.set_updated_at();

-- ============================================================================
-- new-user hook — koppelt auth.users aan profiles bij eerste login/uitnodiging
-- ============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'medewerker')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
