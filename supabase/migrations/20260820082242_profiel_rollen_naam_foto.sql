-- Chronos — meerdere rollen per gebruiker, voornaam/achternaam i.p.v. vrije-tekst
-- full_name, en een profielfoto-kolom.

-- Welke rollen iemand mag aannemen (toegekend door een beheerder). De
-- "actieve" rol blijft profiles.role — is_role() en alle bestaande RLS-policies
-- blijven ongewijzigd, ze lezen nog steeds profiles.role.
create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  primary key (profile_id, role)
);

comment on table public.profile_roles is 'Rollen die aan een gebruiker zijn toegekend; profiles.role is de daaruit gekozen actieve rol.';

alter table public.profile_roles enable row level security;

create policy "profile_roles_select" on public.profile_roles
  for select to authenticated using (profile_id = auth.uid() or public.is_role('beheerder'));

create policy "profile_roles_write_beheerder" on public.profile_roles
  for all to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

grant all on public.profile_roles to authenticated, service_role;

-- Backfill: iedereen krijgt zijn huidige enkele rol als toegewezen rol.
insert into public.profile_roles (profile_id, role) select id, role from public.profiles;

-- Voornaam/achternaam vervangen de vrije-tekst full_name; full_name wordt afgeleid,
-- zodat elke bestaande SELECT op full_name ongewijzigd blijft werken.
alter table public.profiles add column voornaam text;
alter table public.profiles add column achternaam text;

update public.profiles set
  voornaam = split_part(full_name, ' ', 1),
  achternaam = trim(substring(full_name from length(split_part(full_name, ' ', 1)) + 1));

alter table public.profiles alter column voornaam set not null;
alter table public.profiles alter column achternaam set default '';
alter table public.profiles alter column achternaam set not null;

alter table public.profiles drop column full_name;
alter table public.profiles add column full_name text generated always as
  (trim(voornaam || ' ' || achternaam)) stored not null;

alter table public.profiles add column avatar_url text;

comment on column public.profiles.full_name is 'Afgeleid uit voornaam + achternaam — alleen die twee zijn direct instelbaar.';

-- handle_new_user() moet aangepast: full_name is nu generated en kan niet meer
-- rechtstreeks ingevoegd worden. Leest voornaam/achternaam uit metadata, met een
-- terugval op het splitsen van full_name als die (nog) wordt meegegeven.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_voornaam text := new.raw_user_meta_data ->> 'voornaam';
  meta_achternaam text := new.raw_user_meta_data ->> 'achternaam';
  meta_full_name text := new.raw_user_meta_data ->> 'full_name';
  gekozen_rol public.user_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'medewerker');
begin
  if meta_voornaam is null and meta_full_name is not null then
    meta_voornaam := split_part(meta_full_name, ' ', 1);
    meta_achternaam := trim(substring(meta_full_name from length(split_part(meta_full_name, ' ', 1)) + 1));
  end if;

  insert into public.profiles (id, voornaam, achternaam, email, role)
  values (new.id, coalesce(meta_voornaam, new.email), coalesce(meta_achternaam, ''), new.email, gekozen_rol)
  on conflict (id) do nothing;

  insert into public.profile_roles (profile_id, role) values (new.id, gekozen_rol) on conflict do nothing;

  return new;
end;
$$;
