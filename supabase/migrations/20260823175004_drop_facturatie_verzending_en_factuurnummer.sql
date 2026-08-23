-- Facturatie (echte factuur aanmaken + versturen naar de klant) gaat terug naar
-- de backlog — te veel haken en ogen zolang Accountview/Patricia er niet zijn.
-- Chronos genereert vanaf nu alleen nog de specificatie van de geselecteerde
-- factuuritems; het daadwerkelijke factureren gebeurt daarna handmatig, buiten
-- Chronos om. Nog geen echte facturen/verzendingen in productie, dus dit mag
-- een echte opschoning zijn.

alter table public.facturatiebatches
  drop column accountview_factuurnummer,
  drop column accountview_factuurdatum,
  drop column verzend_email,
  drop column verzend_cc,
  drop column verzonden_op,
  drop column verzend_fout,
  drop column factuur_storage_path,
  drop column specificatie_storage_path,
  drop column btw_percentage,
  drop column btw_bedrag,
  drop column btw_vermelding;

comment on table public.facturatiebatches is
  'Groepeert factuuritems waarvoor een specificatie is gegenereerd (geen echte factuur/verzending meer — zie backlog).';

alter table public.klanten drop column verzending_toegestaan;

-- De bucket zelf laten we staan (direct wissen van storage-tabellen is niet
-- toegestaan, en er stond nooit productiedata in) — alleen de policies weg,
-- zodat niemand er meer bij kan; de bucket is verder gewoon dood gewicht.
drop policy if exists "facturen_lezen_finance" on storage.objects;
drop policy if exists "facturen_schrijven_finance" on storage.objects;
drop policy if exists "facturen_bijwerken_finance" on storage.objects;
