-- Een medewerker mocht tot nu toe geen specificatie maken (alleen finance/
-- beheerder/teamleider) — nu wel, maar net als teamleider beperkt tot een
-- klant die zijn eigen team ook echt bedient (team_services_klant), niet
-- zomaar elke klant. Zelfde functie, zelfde scoping-redenering als de
-- teamleider-policies hieronder — team_services_klant() is bewust
-- rolonafhankelijk (toetst alleen de team-relatie), dus hier 1-op-1 te
-- herbruiken.
drop policy "batches_select_scope" on public.facturatiebatches;
create policy "batches_select_scope" on public.facturatiebatches
  for select to authenticated
  using (
    is_role('finance')
    or is_role('beheerder')
    or is_role('teamleider')
    or (is_role('medewerker') and team_services_klant(klant_id))
  );

drop policy "batches_write_finance_beheerder_of_teamleider" on public.facturatiebatches;
create policy "batches_write_finance_beheerder_of_teamleider" on public.facturatiebatches
  for insert to authenticated
  with check (
    is_role('finance')
    or is_role('beheerder')
    or (is_role('teamleider') and team_services_klant(klant_id))
    or (is_role('medewerker') and team_services_klant(klant_id))
  );
