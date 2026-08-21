-- Chronos — BTW wordt vastgelegd op het moment van factureren (snapshot, net
-- als totaal_kantoorkosten al doet): een latere wijziging van het BTW-regime
-- van de klant mag een al verstuurde factuur nooit met terugwerkende kracht
-- veranderen. Daarnaast krijgt de factuur nu twee losse PDF's (factuur +
-- specificatie) in plaats van één gecombineerd document.

alter table public.facturatiebatches add column btw_percentage numeric(5, 2);
alter table public.facturatiebatches add column btw_bedrag numeric(12, 2) not null default 0;
alter table public.facturatiebatches add column btw_vermelding text;

alter table public.facturatiebatches rename column pdf_storage_path to factuur_storage_path;
alter table public.facturatiebatches add column specificatie_storage_path text;

comment on column public.facturatiebatches.btw_percentage is 'BTW-percentage op het moment van factureren (snapshot van klanten.btw_percentage).';
comment on column public.facturatiebatches.btw_bedrag is 'Berekend BTW-bedrag bij deze factuur.';
comment on column public.facturatiebatches.btw_vermelding is 'Snapshot van klanten.btw_vermelding op het moment van factureren.';
comment on column public.facturatiebatches.factuur_storage_path is 'Pad in de Storage-bucket "facturen" naar de gegenereerde factuur-PDF (voorheen pdf_storage_path).';
comment on column public.facturatiebatches.specificatie_storage_path is 'Pad in de Storage-bucket "facturen" naar de gegenereerde specificatie-PDF.';
