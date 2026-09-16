-- Standaard uurtarief (geen specifieke klant/medewerker-tarief van toepassing)
-- van €250 naar €330 — een tariefwijziging raakt nooit bestaande registraties
-- (zie de tabelcomment), dus de oude rij blijft geldig t/m gisteren en een
-- nieuwe rij geldt vanaf vandaag, i.p.v. de oude rij te overschrijven.
update public.tarieven
set einddatum = '2026-09-15'
where klant_id is null and medewerker_id is null and einddatum is null;

insert into public.tarieven (klant_id, medewerker_id, tarief, ingangsdatum)
values (null, null, 330.00, '2026-09-16');
