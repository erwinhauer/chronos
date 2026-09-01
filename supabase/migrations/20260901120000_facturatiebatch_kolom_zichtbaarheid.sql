-- Bij het maken van een specificatie kan de gebruiker per keer kiezen of
-- "Kosten van derden" en "Korting" als aparte kolommen worden getoond (naast
-- de standaardspecificatie). Die keuze wordt, net als de andere totalen,
-- bevroren op de batch zelf vastgelegd — niet aan de (later wijzigbare)
-- klantinstelling gekoppeld — zodat een eenmaal gemaakte specificatie er bij
-- een latere download/weergave niet anders uit gaat zien.

-- "if not exists": deze kolommen zijn handmatig al op productie gezet (vóór
-- de Vercel-deploy die deze migratie zou toepassen), dus de migratie moet
-- veilig herhaalbaar zijn in plaats van te falen op "column already exists".
alter table public.facturatiebatches
  add column if not exists kolom_externe_kosten_zichtbaar boolean not null default false,
  add column if not exists kolom_korting_zichtbaar boolean not null default false;

comment on column public.facturatiebatches.kolom_externe_kosten_zichtbaar is
  'Bevroren keuze bij het maken van deze specificatie, los van klanten.kolom_externe_kosten_zichtbaar.';
comment on column public.facturatiebatches.kolom_korting_zichtbaar is
  'Bevroren keuze bij het maken van deze specificatie, los van klanten.kolom_korting_zichtbaar.';
