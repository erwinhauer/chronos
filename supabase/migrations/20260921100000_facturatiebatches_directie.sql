-- Directie kon facturatiebatches nog niet lezen (de rol bestond nog niet toen
-- batches_select_scope werd geschreven) — RLS filtert dat stilzwijgend weg,
-- geen foutmelding, gewoon nul rijen. Nodig voor de nieuwe bureaukosten-KPI-
-- tegel op het dashboard (directie + beheerder), die uit facturatiebatches
-- leest.
drop policy "batches_select_scope" on public.facturatiebatches;
create policy "batches_select_scope" on public.facturatiebatches
  for select to authenticated
  using (
    is_role('finance')
    or is_role('beheerder')
    or is_role('directie')
    or is_role('teamleider')
    or (is_role('medewerker') and team_services_klant(klant_id))
  );
