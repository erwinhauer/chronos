-- Chronos: zelf-registratie levert nooit meer een rol op.
-- handle_new_user() las de rol uit raw_user_meta_data, een veld dat een gebruiker zelf vult via de
-- publieke signUp-API. Nu komt de rol alleen uit raw_app_meta_data, dat alleen met de service-role
-- (admin API) te schrijven is. createGebruiker stuurt de rol daarom als app_metadata mee en zet
-- profiles.role daarna ook expliciet.
-- Terugdraaien: een nieuwe migratie met de functie uit 20260820082242_profiel_rollen_naam_foto.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_voornaam text := new.raw_user_meta_data ->> 'voornaam';
  meta_achternaam text := new.raw_user_meta_data ->> 'achternaam';
  meta_full_name text := new.raw_user_meta_data ->> 'full_name';
  gekozen_rol public.user_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role, 'medewerker');
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
