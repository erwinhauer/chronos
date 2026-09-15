-- shares_team_with(medewerker_id) toetst of de kijker ÍRGENS een team deelt
-- met de aanmaker van het factuuritem — niet of dat specifieke item wel voor
-- een gedeeld team is. Een teamlid dat ook in een ander team zit (waar de
-- kijker geen lid van is) liet zo al zijn/haar items van dát andere team
-- zien. Vervangen door een check op het eigen team_id van het item: alleen
-- zichtbaar voor wie daadwerkelijk lid is van dát team. Bij team_id null
-- (oude, niet-teruggevulde rijen) blijft het bestaande shares_team_with-
-- gedrag als fallback bestaan, om historische zichtbaarheid niet te breken.
drop policy "factuuritems_select_scope" on public.factuuritems;
create policy "factuuritems_select_scope" on public.factuuritems
  for select to authenticated using (
    public.is_active_user() and (
      medewerker_id = auth.uid()
      or public.is_role('finance')
      or public.is_role('beheerder')
      or public.is_role('directie')
      or (
        team_id is not null
        and exists (
          select 1 from public.team_members
          where team_members.team_id = factuuritems.team_id
            and team_members.profile_id = auth.uid()
        )
      )
      or (
        team_id is null
        and public.shares_team_with(medewerker_id)
      )
    )
  );
