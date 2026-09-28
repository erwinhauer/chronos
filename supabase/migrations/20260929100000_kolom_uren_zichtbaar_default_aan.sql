-- Chronos — Tarief stond al standaard aan (kolom_tarief_zichtbaar default true),
-- maar de "normale" (niet-uitgebreide) specificatie liet 'm toch weg — dat was
-- code-logica (metSpecificatieDetailniveau), nu gefixt. Aantal (Qty) had zelf
-- nog geen "aan"-default: op verzoek nu ook standaard aan, zowel voor nieuwe
-- klanten als (via de update) voor alle bestaande.
alter table public.klanten alter column kolom_uren_zichtbaar set default true;

update public.klanten set kolom_uren_zichtbaar = true where kolom_uren_zichtbaar = false;
