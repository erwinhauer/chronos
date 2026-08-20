-- Chronos — fase 4 van de facturatie-routekaart: PDF-opmaak en verzending via
-- Resend. Omzet blijft geboekt op het moment van bevestigen (fase 3-besluit);
-- deze kolommen registreren alleen of/hoe de daadwerkelijke verzending liep,
-- zonder dat een mislukte verzending de boeking terugdraait.

alter table public.facturatiebatches
  add column verzonden_op timestamptz,
  add column verzend_fout text,
  add column pdf_storage_path text;

comment on column public.facturatiebatches.verzonden_op is 'Tijdstip waarop de factuur-PDF succesvol per e-mail is verstuurd (null = nog niet, of mislukt).';
comment on column public.facturatiebatches.verzend_fout is 'Laatste foutmelding bij verzending, voor "opnieuw versturen" op de specificatiepagina.';
comment on column public.facturatiebatches.pdf_storage_path is 'Pad in de Storage-bucket "facturen" naar de gegenereerde PDF van deze factuur.';

-- Facturen zijn financiële documenten — geen publieke bucket zoals avatars.
insert into storage.buckets (id, name, public) values ('facturen', 'facturen', false)
  on conflict (id) do nothing;

create policy "facturen_lezen_finance" on storage.objects
  for select to authenticated
  using (bucket_id = 'facturen' and (public.is_role('finance') or public.is_role('beheerder') or public.is_role('directie')));

create policy "facturen_schrijven_finance" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'facturen' and (public.is_role('finance') or public.is_role('beheerder')));

create policy "facturen_bijwerken_finance" on storage.objects
  for update to authenticated
  using (bucket_id = 'facturen' and (public.is_role('finance') or public.is_role('beheerder')));
