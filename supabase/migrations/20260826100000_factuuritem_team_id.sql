-- team_id op factuuritems: teamrapportages rekenen een item vandaag toe aan
-- ELK team van de medewerker (via team_members) — voor een medewerker in
-- meerdere teams is dat onjuist/dubbel. team_id maakt per item expliciet voor
-- welk team het is, i.p.v. impliciet af te leiden uit teamlidmaatschap.
alter table public.factuuritems add column team_id uuid references public.teams (id);

-- Backfill: alleen invullen waar de medewerker op dit moment in precies 1 team
-- zit — bij 0 of 2+ teams is het team van een bestaand item niet met
-- terugwerkende kracht te herleiden, dus blijft team_id daar bewust null (de
-- dashboardquery's vallen voor zulke rijen terug op teamlidmaatschap, zie de
-- applicatiecode).
update public.factuuritems fi
set team_id = (select tm.team_id from public.team_members tm where tm.profile_id = fi.medewerker_id)
where (select count(*) from public.team_members tm2 where tm2.profile_id = fi.medewerker_id) = 1;

-- Nooit vertrouwen op de client welk team gekozen is: het gekozen team moet
-- een team zijn waar de medewerker (van dit item) daadwerkelijk lid van is.
drop policy "factuuritems_insert_eigen" on public.factuuritems;
create policy "factuuritems_insert_eigen" on public.factuuritems
  for insert to authenticated
  with check (
    public.is_active_user() and medewerker_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1 from public.team_members
        where team_members.team_id = factuuritems.team_id
          and team_members.profile_id = factuuritems.medewerker_id
      )
    )
  );

drop policy "factuuritems_update_medewerker_aangemaakt" on public.factuuritems;
create policy "factuuritems_update_medewerker_aangemaakt" on public.factuuritems
  for update to authenticated
  using (public.is_active_user() and medewerker_id = auth.uid() and status = 'aangemaakt')
  with check (
    medewerker_id = auth.uid()
    and (
      team_id is null
      or exists (
        select 1 from public.team_members
        where team_members.team_id = factuuritems.team_id
          and team_members.profile_id = factuuritems.medewerker_id
      )
    )
  );
