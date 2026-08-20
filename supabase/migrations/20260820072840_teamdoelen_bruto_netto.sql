-- Chronos — apart bruto- en nettotarget per team (was één "bedrag"-kolom),
-- en directie krijgt leestoegang tot factuuritems (nodig voor het dashboard,
-- los van dat directie geen navigatie naar de Factuuritems-pagina krijgt).

alter table public.teamdoelen rename column bedrag to bruto_bedrag;
alter table public.teamdoelen add column netto_bedrag numeric(12, 2);

comment on column public.teamdoelen.bruto_bedrag is 'Jaarlijks brutotarget; on-target-berekening op het dashboard gaat hierop.';
comment on column public.teamdoelen.netto_bedrag is 'Optioneel jaarlijks nettotarget; berekeningswijze van de bijbehorende netto-omzet volgt later.';

drop policy "factuuritems_select_scope" on public.factuuritems;
create policy "factuuritems_select_scope" on public.factuuritems
  for select to authenticated using (
    public.is_active_user() and (
      medewerker_id = auth.uid()
      or public.is_role('finance')
      or public.is_role('beheerder')
      or public.is_role('directie')
      or public.shares_team_with(medewerker_id)
    )
  );
