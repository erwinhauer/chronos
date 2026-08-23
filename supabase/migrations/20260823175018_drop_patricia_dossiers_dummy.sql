-- De dummy Patricia-dossiers-tabel was altijd al bedoeld als tijdelijke
-- stand-in (typeahead-databron) tot de echte Patricia-koppeling er is. Tot die
-- tijd typt de gebruiker het dossiernummer/de dossiernummers gewoon vrij in
-- (parseDossiernummer() blijft de bron voor type_dienst/land, zoals altijd al).
drop table public.patricia_dossiers;
