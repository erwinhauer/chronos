-- Functies met een uurtarief.
--
-- Een beheerder beheert functies (bv. Partner, Senior attorney, Paralegal) en koppelt ze aan
-- gebruikers. Aan een functie hangt een uurtarief dat als voorzet wordt gegeven bij een nieuw
-- factuuritem. Het tarief staat, net als alle andere tarieven, in `tarieven` (met ingangs- en
-- einddatum), zodat een tariefwijziging nooit bestaande registraties raakt en in de auditlog
-- terug te vinden is.
--
-- Rangorde in resolve_tarief (meest specifiek eerst):
--   1. klant + medewerker  2. medewerker  3. klant  4. functie van de medewerker  5. algemeen

create table public.functies (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(btrim(naam)) between 1 and 80),
  created_at timestamptz not null default now()
);

create unique index functies_naam_uniek on public.functies (lower(btrim(naam)));

comment on table public.functies is 'Functies die een beheerder aan gebruikers koppelt. Het uurtarief van een functie staat in tarieven (functie_id).';

alter table public.functies enable row level security;

create policy "functies_select_authenticated" on public.functies
  for select to authenticated using (public.is_active_user());

create policy "functies_insert_beheerder" on public.functies
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "functies_update_beheerder" on public.functies
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

create policy "functies_delete_beheerder" on public.functies
  for delete to authenticated using (public.is_role('beheerder'));

-- Koppeling gebruiker -> functie. Verwijderen van een functie laat de gebruiker zonder functie achter.
alter table public.profiles
  add column functie_id uuid references public.functies (id) on delete set null;

-- Tarief van een functie: dezelfde tabel, met functie_id gevuld en klant/medewerker leeg.
-- Verwijderen van een functie ruimt ook de tarieven ervan op (registraties bewaren hun eigen tarief).
alter table public.tarieven
  add column functie_id uuid references public.functies (id) on delete cascade;

alter table public.tarieven
  add constraint tarieven_functie_zonder_klant_medewerker
  check (functie_id is null or (klant_id is null and medewerker_id is null));

create index idx_tarieven_functie on public.tarieven (functie_id, ingangsdatum)
  where functie_id is not null;

-- Zelfbediening: een gebruiker mag zijn eigen functie niet wijzigen (het tarief hangt eraan).
create or replace function public.enforce_profile_self_edit_limits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- service-role (admin-server-actie) of een ingelogde beheerder mag alles.
  if auth.role() = 'service_role' or public.is_role('beheerder') then
    return new;
  end if;

  if current_setting('app.role_switch', true) = 'true' then
    -- Alleen tijdens switch_active_role() mag `role` veranderen; overige velden vast.
    new.voornaam := old.voornaam;
    new.achternaam := old.achternaam;
    new.actief := old.actief;
    new.functie_id := old.functie_id;
    return new;
  end if;

  -- Gewone zelf-update (bv. profielfoto): naam/rol/actief/functie mogen niet mee-wijzigen.
  new.role := old.role;
  new.voornaam := old.voornaam;
  new.achternaam := old.achternaam;
  new.actief := old.actief;
  new.functie_id := old.functie_id;
  return new;
end;
$$;

-- Tariefresolutie, nu met het functietarief tussen "klant" en "algemeen".
-- Binnen een niveau geldt het tarief met de meest recente ingangsdatum die nog geldig is.
create or replace function public.resolve_tarief(p_klant_id uuid, p_medewerker_id uuid, p_datum date)
returns numeric
language sql
stable
as $$
  select t.tarief
  from public.tarieven t
  where t.ingangsdatum <= p_datum
    and (t.einddatum is null or t.einddatum >= p_datum)
    and (
      (t.functie_id is null and t.klant_id = p_klant_id and t.medewerker_id = p_medewerker_id)
      or (t.functie_id is null and t.klant_id is null and t.medewerker_id = p_medewerker_id)
      or (t.functie_id is null and t.klant_id = p_klant_id and t.medewerker_id is null)
      or (t.functie_id is not null and t.functie_id = (select p.functie_id from public.profiles p where p.id = p_medewerker_id))
      or (t.functie_id is null and t.klant_id is null and t.medewerker_id is null)
    )
  order by
    case
      when t.functie_id is not null then 3
      when t.klant_id = p_klant_id and t.medewerker_id = p_medewerker_id then 0
      when t.klant_id is null and t.medewerker_id = p_medewerker_id then 1
      when t.klant_id = p_klant_id and t.medewerker_id is null then 2
      else 4
    end,
    t.ingangsdatum desc
  limit 1;
$$;

comment on function public.resolve_tarief is 'Bepaalt het meest specifieke geldige tarief op een datum: klant+medewerker, medewerker, klant, functie van de medewerker, algemeen. Retourneert null als er geen tarief van toepassing is.';

-- Het "standaard" uurtarief van een medewerker: het tarief van zijn functie, of het algemene
-- kantoortarief als hij geen functie (met tarief) heeft. De factuuritem-pagina gebruikt dit als
-- ondergrens voor de "voorgesteld tarief"-melding.
create function public.resolve_standaardtarief(p_medewerker_id uuid, p_datum date)
returns numeric
language sql
stable
as $$
  select t.tarief
  from public.tarieven t
  where t.ingangsdatum <= p_datum
    and (t.einddatum is null or t.einddatum >= p_datum)
    and (
      (t.functie_id is not null and t.functie_id = (select p.functie_id from public.profiles p where p.id = p_medewerker_id))
      or (t.functie_id is null and t.klant_id is null and t.medewerker_id is null)
    )
  order by (t.functie_id is null), t.ingangsdatum desc
  limit 1;
$$;

comment on function public.resolve_standaardtarief is 'Standaard uurtarief van een medewerker op een datum: functietarief, anders het algemene tarief.';
