-- Chronos — een factuuritem kunnen verwijderen (was helemaal niet mogelijk:
-- er stond nog geen enkele delete-policy op, dus RLS blokkeerde iedere
-- delete). Zelfde toegangsregel als de bestaande update-policies: de eigen
-- medewerker of finance/beheerder, en alleen zolang de status "aangemaakt" is
-- (nooit een al gefactureerd/definitief item). factuuritem_dossiers volgt via
-- de bestaande "factuuritem_dossiers_write_via_parent"-policy + on delete cascade.

create policy "factuuritems_delete_medewerker_aangemaakt" on public.factuuritems
  for delete to authenticated
  using (public.is_active_user() and medewerker_id = auth.uid() and status = 'aangemaakt');

create policy "factuuritems_delete_finance_beheerder" on public.factuuritems
  for delete to authenticated
  using ((public.is_role('finance') or public.is_role('beheerder')) and status = 'aangemaakt');
