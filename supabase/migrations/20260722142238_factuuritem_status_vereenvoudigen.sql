-- Chronos — factuuritem-status vereenvoudigen van 9 naar 2 waarden.
-- "definitief" = gefactureerd; eenmaal definitief is een regel voor niemand
-- meer wijzigbaar via de normale update-policies (ook finance/beheerder niet).
-- De teruggestuurd-status (en het bijbehorende terugstuur_reden-veld) verviel
-- met de goedkeuringsworkflow die nooit in de UI is gebouwd.

drop policy "factuuritems_update_medewerker_concept" on public.factuuritems;
drop policy "factuuritems_update_finance_beheerder" on public.factuuritems;

alter table public.factuuritems drop constraint factuuritems_terugstuur_reden_check;
alter table public.factuuritems drop column terugstuur_reden;

alter table public.factuuritems alter column status drop default;
alter table public.factuuritems alter column status type text using status::text;

update public.factuuritems
  set status = case when status = 'gefactureerd' then 'definitief' else 'aangemaakt' end;

drop type public.factuuritem_status;
create type public.factuuritem_status as enum ('aangemaakt', 'definitief');

alter table public.factuuritems
  alter column status type public.factuuritem_status using status::public.factuuritem_status;
alter table public.factuuritems alter column status set default 'aangemaakt';

comment on column public.factuuritems.status is 'aangemaakt = nog te wijzigen; definitief = gefactureerd, voor niemand meer wijzigbaar via de normale update-policies.';

create policy "factuuritems_update_medewerker_aangemaakt" on public.factuuritems
  for update to authenticated
  using (public.is_active_user() and medewerker_id = auth.uid() and status = 'aangemaakt')
  with check (medewerker_id = auth.uid());

create policy "factuuritems_update_finance_beheerder" on public.factuuritems
  for update to authenticated
  using ((public.is_role('finance') or public.is_role('beheerder')) and status = 'aangemaakt')
  with check (public.is_role('finance') or public.is_role('beheerder'));
