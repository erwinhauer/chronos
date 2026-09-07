-- Chronos — een teamleider kon een nog niet gefactureerd factuuritem van een
-- teamgenoot wel bewerken/toewijzen (factuuritems_update_teamleider_factureren)
-- maar niet verwijderen: er stond geen delete-policy voor teamleider op
-- factuuritems, alleen voor de eigen medewerker en finance/beheerder. RLS
-- blokkeerde de delete dan stilzwijgend (0 rijen verwijderd, geen fout), en de
-- app interpreteerde dat als "al definitief/gefactureerd" — terwijl het item
-- gewoon nog "aangemaakt" was. Dit werd pas zichtbaar/bereikbaar sinds een
-- teamleider een factuuritem nu aan een teamgenoot kan toewijzen.
--
-- Zelfde scope als de bestaande update-policy voor teamleider hier
-- (team_services_klant): alleen zolang status "aangemaakt" is, en alleen voor
-- klanten die het team van de teamleider al bedient.

create policy "factuuritems_delete_teamleider" on public.factuuritems
  for delete to authenticated
  using (public.is_role('teamleider') and status = 'aangemaakt' and public.team_services_klant(klant_id));
