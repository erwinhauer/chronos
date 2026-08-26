-- "WW" wordt in de praktijk gebruikt in dossiernummers om iets als wereldwijd/
-- niet landgebonden te markeren (los van "WO" = internationale/WIPO-
-- registratie) — stond nog nergens in landcodes, dus viel terug op de kale
-- code zelf.
insert into public.landcodes (iso_code, naam_nl, naam_en) values
  ('WW', 'Wereldwijd', 'Worldwide')
on conflict (iso_code) do nothing;
