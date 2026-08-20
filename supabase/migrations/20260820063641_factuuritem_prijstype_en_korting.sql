-- Chronos — prijstype wordt een verplichte, bewuste keuze (geen impliciete default
-- meer via een checkbox), en korting krijgt een bedrag/percentage-modus met een
-- aangescherpt plafond: nooit meer dan het honorarium, externe kosten tellen niet
-- meer mee (voorheen: honorarium + externe_kosten).

create type public.prijstype as enum ('uren', 'vast_honorarium');

alter table public.factuuritems add column prijstype public.prijstype;

-- Backfill puur ter behoud van bestaande rijen; raakt honorarium/tarief niet aan.
update public.factuuritems
  set prijstype = case when tarief is null then 'vast_honorarium' else 'uren' end::public.prijstype;

alter table public.factuuritems alter column prijstype set not null;
-- Bewust geen default: nieuwe inserts moeten de keuze expliciet meegeven.

comment on column public.factuuritems.prijstype is 'Betekenis van tarief op deze regel voor weergave ("3 uur x tarief" vs vaste fee). Honorarium = qty * tarief in beide gevallen.';

create type public.korting_type as enum ('bedrag', 'percentage');

alter table public.factuuritems add column korting_type public.korting_type not null default 'bedrag';
alter table public.factuuritems add column korting_percentage numeric(5, 2);

comment on column public.factuuritems.korting_type is 'Hoe korting is ingevoerd; korting zelf is en blijft het opgeloste bedrag.';
comment on column public.factuuritems.korting_percentage is 'Ingevoerd percentage indien korting_type = percentage (alleen voor weergave/re-editing).';

-- BR-05 aangescherpt: korting mag nooit meer zijn dan honorarium alleen.
alter table public.factuuritems drop constraint factuuritems_korting_check;
alter table public.factuuritems add constraint factuuritems_korting_check check (korting <= honorarium);
