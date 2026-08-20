-- Chronos — dicht de bestaande kolom-escalatie op profiles (RLS regelt alleen
-- "welke rij", niet "welke kolom" — vandaag kan elke gebruiker via een directe
-- API-call zijn eigen role/naam/actief aanpassen) en voegt de rol-wissel-RPC toe.

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
    return new;
  end if;

  -- Gewone zelf-update (bv. profielfoto): naam/rol/actief mogen niet mee-wijzigen.
  new.role := old.role;
  new.voornaam := old.voornaam;
  new.achternaam := old.achternaam;
  new.actief := old.actief;
  return new;
end;
$$;

create trigger trg_profiles_self_edit_limits before update on public.profiles
  for each row execute function public.enforce_profile_self_edit_limits();

create function public.switch_active_role(target_role public.user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_roles where profile_id = auth.uid() and role = target_role
  ) then
    raise exception 'Deze rol is niet aan je toegekend.';
  end if;
  perform set_config('app.role_switch', 'true', true);
  update public.profiles set role = target_role where id = auth.uid();
end;
$$;

grant execute on function public.switch_active_role(public.user_role) to authenticated;

-- Profielfoto's: publiek leesbaar (onraadbaar per-gebruiker pad), alleen de
-- eigenaar mag zijn eigen map beschrijven.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars_read_all" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_write_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
