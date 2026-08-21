-- Chronos — BTW-regime per klant. Tijdelijk handmatig instelbaar door de
-- beheerder; komt later uit de Patricia-koppeling. De vrije tekst is bedoeld
-- voor de wettelijke vermelding bij een afwijkend regime (bv. verlegd/export)
-- en wordt door het kantoor zelf bepaald — Chronos verzint geen juridische tekst.

alter table public.klanten add column btw_percentage numeric(5, 2) not null default 21.00;
alter table public.klanten add column btw_vermelding text;

comment on column public.klanten.btw_percentage is 'BTW-percentage voor de factuur; tijdelijk handmatig, komt later uit de Patricia-koppeling.';
comment on column public.klanten.btw_vermelding is 'Wettelijke vermelding op de factuur bij een afwijkend BTW-regime (bv. verlegd/export), vrij invoerbaar door de beheerder.';
