-- Chronos — fase 2 van de facturatie-routekaart: een korting op de hele
-- factuur, los van de optelsom van regelkortingen (totaal_korting).

alter table public.facturatiebatches
  add column extra_korting numeric(10, 2) not null default 0;

alter table public.facturatiebatches
  add constraint facturatiebatches_extra_korting_check
  check (
    extra_korting >= 0
    and extra_korting <= totaal_honorarium + totaal_externe_kosten - totaal_korting + totaal_kantoorkosten
  );

comment on column public.facturatiebatches.extra_korting is
  'Extra korting op de hele factuur, los van de som van regelkortingen (totaal_korting).';
