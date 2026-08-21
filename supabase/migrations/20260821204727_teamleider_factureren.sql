-- Chronos — een teamleider mag nu ook zelf factuuritems van zijn/haar team
-- selecteren en factureren (was alleen finance/beheerder). RLS-select op
-- facturatiebatches liet teamleider al toe, maar de write-kant (aanmaken van
-- de batch, en het bijbehorende "definitief" zetten van de factuuritems) nog
-- niet — die volgen hier, gescoped op dezelfde manier als de eerdere
-- teamleider-uitbreiding voor projectbeheer (public.team_services_klant).

drop policy "batches_write_finance_beheerder" on public.facturatiebatches;

create policy "batches_write_finance_beheerder_of_teamleider" on public.facturatiebatches
  for insert to authenticated
  with check (
    public.is_role('finance')
    or public.is_role('beheerder')
    or (public.is_role('teamleider') and public.team_services_klant(klant_id))
  );

create policy "factuuritems_update_teamleider_factureren" on public.factuuritems
  for update to authenticated
  using (public.is_role('teamleider') and status = 'aangemaakt' and public.team_services_klant(klant_id))
  with check (public.is_role('teamleider') and public.team_services_klant(klant_id));

-- Storage-bucket "facturen": teamleider mag nu ook lezen/schrijven (de PDF's
-- die bij het factureren worden gegenereerd/gedownload) — zelfde blanket
-- rolcheck als finance/beheerder/directie hier al hadden, geen per-pad scope
-- nodig want de onderliggende data is al via facturatiebatches-RLS gescoped.
drop policy "facturen_lezen_finance" on storage.objects;
drop policy "facturen_schrijven_finance" on storage.objects;
drop policy "facturen_bijwerken_finance" on storage.objects;

create policy "facturen_lezen_finance" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'facturen'
    and (public.is_role('finance') or public.is_role('beheerder') or public.is_role('directie') or public.is_role('teamleider'))
  );

create policy "facturen_schrijven_finance" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'facturen'
    and (public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider'))
  );

create policy "facturen_bijwerken_finance" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'facturen'
    and (public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider'))
  );
