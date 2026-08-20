-- Chronos — fase 3 van de facturatie-routekaart: het e-mailadres (en cc) van
-- de debiteur vastleggen op het voorbeeldscherm. Het daadwerkelijk versturen
-- is fase 4 — deze kolommen worden nu al geschreven, maar nog niet gelezen
-- door een verzendjob.

alter table public.facturatiebatches
  add column verzend_email text,
  add column verzend_cc text[];

comment on column public.facturatiebatches.verzend_email is 'E-mailadres van de debiteur voor de (nog te bouwen) factuurverzending.';
comment on column public.facturatiebatches.verzend_cc is 'Cc-adressen voor de (nog te bouwen) factuurverzending.';
