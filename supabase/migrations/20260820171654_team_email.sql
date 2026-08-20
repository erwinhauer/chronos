-- Chronos — een team-mailadres, zodat het team in cc kan bij het versturen
-- van een factuur voor een klant die dat team bedient.

alter table public.teams add column email text;

comment on column public.teams.email is 'Team-mailadres, wordt in cc gezet bij het versturen van facturen.';
