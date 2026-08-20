-- Chronos — fase 1 van de facturatie-routekaart: bestaande schakelaars
-- zichtbaar/bruikbaar maken, zonder nieuw gedrag toe te voegen.

-- kolom_externe_kosten_zichtbaar had een misleidende comment ("standaard aan");
-- de kolom zelf staat al terecht op `default false`. Alleen de comment corrigeren.
comment on column public.klanten.kolom_externe_kosten_zichtbaar is
  'Standaard uit; per klant instelbaar of kosten van derden apart op de specificatie tonen.';

-- Taal wijzigen vanuit het factuuritem-scherm: een smalle uitzondering op de
-- verder beheerder-only RLS op klanten — alleen deze ene kolom, voor elke
-- actieve gebruiker. Zelfde patroon als switch_active_role() voor profiles.
create function public.set_klant_taal(target_klant_id uuid, nieuwe_taal public.specificatietaal)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Niet toegestaan.';
  end if;
  update public.klanten set specificatietaal = nieuwe_taal where id = target_klant_id;
end;
$$;

grant execute on function public.set_klant_taal(uuid, public.specificatietaal) to authenticated;

-- Dossiernummer-lettercode "CA" heet voortaan "Cancellations" (was "Cancellation
-- Actions"); bestaande, al opgeslagen specificatie-rijen meenemen zodat oude en
-- nieuwe registraties dezelfde tekst tonen.
update public.factuuritem_dossiers set type_dienst = 'Cancellations' where type_dienst = 'Cancellation Actions';

-- Projectbeheer: naast beheerder mag ook een teamleider projecten/PO-nummers
-- beheren voor klanten die zijn team al bedient (minstens één factuuritem van
-- een teamgenoot op die klant) — geen nieuwe klant-team-tabel nodig hiervoor.
create function public.team_services_klant(target_klant_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.factuuritems fi
    join public.team_members tm_eigen on tm_eigen.profile_id = auth.uid()
    join public.team_members tm_ander on tm_ander.team_id = tm_eigen.team_id
    where fi.klant_id = target_klant_id
      and fi.medewerker_id = tm_ander.profile_id
  );
$$;

grant execute on function public.team_services_klant(uuid) to authenticated;

drop policy if exists "projecten_write_beheerder" on public.projecten;
drop policy if exists "projecten_update_beheerder" on public.projecten;

create policy "projecten_write_beheerder_of_teamleider" on public.projecten
  for insert to authenticated
  with check (
    public.is_role('beheerder')
    or (public.is_role('teamleider') and public.team_services_klant(klant_id))
  );

create policy "projecten_update_beheerder_of_teamleider" on public.projecten
  for update to authenticated
  using (
    public.is_role('beheerder')
    or (public.is_role('teamleider') and public.team_services_klant(klant_id))
  )
  with check (
    public.is_role('beheerder')
    or (public.is_role('teamleider') and public.team_services_klant(klant_id))
  );
