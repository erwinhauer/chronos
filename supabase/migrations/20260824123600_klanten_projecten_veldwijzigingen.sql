-- Contactpersoon-koppeling op klanten is nooit gebruikt (geen koppeling met
-- Patricia, geen mailings vanuit Chronos) en wordt niet meer aangeboden in de
-- klant-formulieren — kolommen kunnen weg.
alter table public.klanten drop column if exists contactpersoon_naam;
alter table public.klanten drop column if exists contact_email;

-- Projecten krijgen een vrije omschrijving naast naam en PO-nummer, zichtbaar
-- bij de factuuritems van de klant.
alter table public.projecten add column if not exists omschrijving text;
