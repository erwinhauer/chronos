-- Een medewerker mocht tot nu toe alleen zijn eigen factuuritems bewerken
-- (factuuritems_update_medewerker_aangemaakt). Vanaf nu mag iedereen ook een
-- item van een teamgenoot bewerken (zien kon al via factuuritems_select_scope
-- — dat is puur SELECT, wijzigen vereist deze eigen UPDATE-policy) zolang het
-- item bij een team hoort waar de kijker zelf ook lid van is. Dit maakt ook
-- "verplaatsen naar project" voor een medewerker mogelijk voor teamgenoten-
-- items, naast de eigen items die al langer via de bestaande policy mochten.
--
-- USING toetst het team_id zoals het NU is (mag ik dit item aanraken?);
-- WITH CHECK toetst het team_id zoals het NA de wijziging is — als de
-- medewerker daarbij ook zelf wordt gewijzigd (herToewijzen mag, net als bij
-- teamleider/beheerder), moet team_id zowel bij de NIEUWE medewerker als bij
-- de kijker zelf horen — anders zou je een item buiten je eigen team(s) om
-- kunnen toewijzen.
create policy "factuuritems_update_teamgenoot" on public.factuuritems
  for update to authenticated
  using (
    is_active_user()
    and status = 'aangemaakt'
    and team_id is not null
    and exists (
      select 1 from public.team_members
      where team_members.team_id = factuuritems.team_id
        and team_members.profile_id = auth.uid()
    )
  )
  with check (
    team_id is not null
    and exists (
      select 1 from public.team_members
      where team_members.team_id = factuuritems.team_id
        and team_members.profile_id = factuuritems.medewerker_id
    )
    and exists (
      select 1 from public.team_members
      where team_members.team_id = factuuritems.team_id
        and team_members.profile_id = auth.uid()
    )
  );
