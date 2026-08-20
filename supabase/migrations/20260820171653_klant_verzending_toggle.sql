-- Chronos — sommige klanten hebben een eigen billing-systeem: dan is alleen
-- de PDF nodig en mag Chronos geen e-mail versturen.

alter table public.klanten add column verzending_toegestaan boolean not null default true;

comment on column public.klanten.verzending_toegestaan is
  'Als false: alleen de factuur-PDF aanmaken/opslaan, niet per e-mail versturen (klant werkt met een eigen billing-systeem).';
