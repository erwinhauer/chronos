-- Chronos — Finance wordt read-only, gelijk aan Directie (op verzoek). Finance kon
-- tot nu toe zelf specificaties/facturatiebatches aanmaken en factuuritems bewerken/
-- verwijderen — meer dan Directie, die vandaag nergens schrijfrechten heeft. Elke
-- policy die finance mee liet schrijven wordt hier herzien: finance blijft er alleen
-- in staan waar directie het ook al mag (facturatiebatches/factuuritems SELECT),
-- en wordt overal elders verwijderd. "Vooralsnog" (kan later weer uiteenlopen).
--
-- Daarnaast: nieuwe factuuritems aanmaken is voorbehouden aan medewerker/teamleider/
-- beheerder — finance en directie mochten dat via factuuritems_insert_eigen eigenlijk
-- al nooit bedoeld zijn (die policy checkte alleen "voor jezelf", niet de rol), maar
-- konden zo toch zelf een factuuritem voor zichzelf aanmaken. Nu expliciet dichtgezet.

-- facturatiebatches: finance verliest insert/update, houdt select (zoals directie).
drop policy "batches_update_finance_teamleider_beheerder" on public.facturatiebatches;
create policy "batches_update_teamleider_beheerder" on public.facturatiebatches
  for update to authenticated
  using (is_role('beheerder') or is_role('teamleider'))
  with check (is_role('beheerder') or is_role('teamleider'));

drop policy "batches_write_finance_beheerder_of_teamleider" on public.facturatiebatches;
create policy "batches_write_beheerder_of_teamleider" on public.facturatiebatches
  for insert to authenticated
  with check (
    is_role('beheerder')
    or (is_role('teamleider') and team_services_klant(klant_id))
    or (is_role('medewerker') and team_services_klant(klant_id))
  );

-- factuuritem_dossiers: finance verliest schrijftoegang via de ouder-factuuritem-check.
drop policy "factuuritem_dossiers_write_via_parent" on public.factuuritem_dossiers;
create policy "factuuritem_dossiers_write_via_parent" on public.factuuritem_dossiers
  for all to authenticated
  using (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (
          fi.medewerker_id = auth.uid()
          or is_role('beheerder')
          or (is_role('teamleider') and team_services_klant(fi.klant_id))
        )
        and fi.status = 'aangemaakt'
    )
  )
  with check (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (
          fi.medewerker_id = auth.uid()
          or is_role('beheerder')
          or (is_role('teamleider') and team_services_klant(fi.klant_id))
        )
    )
  );

-- factuuritems: finance verliest update/delete, houdt select (zoals directie).
drop policy "factuuritems_delete_finance_beheerder" on public.factuuritems;
create policy "factuuritems_delete_beheerder" on public.factuuritems
  for delete to authenticated
  using (is_role('beheerder') and status = 'aangemaakt');

drop policy "factuuritems_update_finance_beheerder" on public.factuuritems;
create policy "factuuritems_update_beheerder" on public.factuuritems
  for update to authenticated
  using (is_role('beheerder') and status = 'aangemaakt')
  with check (is_role('beheerder'));

-- factuuritems: alleen medewerker/teamleider mogen straks nog "voor zichzelf"
-- aanmaken via deze policy (beheerder/teamleider-voor-team lopen al via de andere
-- insert-policy) — finance/directie expliciet uitgesloten.
drop policy "factuuritems_insert_eigen" on public.factuuritems;
create policy "factuuritems_insert_eigen" on public.factuuritems
  for insert to authenticated
  with check (
    is_active_user()
    and (is_role('medewerker') or is_role('teamleider'))
    and medewerker_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1 from public.team_members
        where team_members.team_id = factuuritems.team_id
          and team_members.profile_id = factuuritems.medewerker_id
      )
    )
  );

-- specificaties: finance verliest alle toegang (directie heeft hier vandaag ook
-- niets), houdt alleen beheerder/teamleider over waar dat al zo was.
drop policy "specificaties_select_scope" on public.specificaties;
create policy "specificaties_select_scope" on public.specificaties
  for select to authenticated
  using (is_role('beheerder') or is_role('teamleider'));

drop policy "specificaties_update_finance_beheerder" on public.specificaties;
create policy "specificaties_update_beheerder" on public.specificaties
  for update to authenticated
  using (is_role('beheerder') and vergrendeld = false)
  with check (is_role('beheerder'));

drop policy "specificaties_write_finance_beheerder" on public.specificaties;
create policy "specificaties_write_beheerder" on public.specificaties
  for insert to authenticated
  with check (is_role('beheerder'));
