insert into public.landcodes (iso_code, naam_nl, naam_en) values ('MI', 'Multisearch', 'Multisearch') on conflict (iso_code) do nothing;
