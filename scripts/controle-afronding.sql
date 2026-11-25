-- Controle op afronding (alleen lezen, wijzigt niets). Te draaien in de Supabase SQL-editor van LIVE of BETA.
--
-- Achtergrond: Chronos rondde bedragen af met JavaScript-kommagetallen, waardoor een exacte halve cent soms een
-- cent anders uitkwam dan gewone afronding (van nul af, zoals Postgres bij numeric(x,2) ook doet). De nieuwe
-- versie rekent exact. Opgeslagen bedragen worden NIET aangepast. Deze queries tonen hoeveel bestaande items
-- en specificaties een bedrag hebben dat met de nieuwe afronding een cent anders zou zijn.

-- 1. Honorarium: opgeslagen bedrag tegenover het exacte product van aantal x tarief.
--    "een_cent_verschil" is het effect van de oude afronding. "groter_verschil" heeft een andere oorzaak (bijvoorbeeld
--    een handmatig aangepast bedrag of testdata) en valt buiten deze wijziging.
select
  count(*)                                                                          as aantal_items,
  count(*) filter (where abs(round(qty * tarief, 2) - honorarium) = 0.01)           as een_cent_verschil,
  count(*) filter (where abs(round(qty * tarief, 2) - honorarium) > 0.01)           as groter_verschil
from public.factuuritems
where tarief is not null;

-- 2. Korting als percentage: opgeslagen korting tegenover het exacte percentage van het opgeslagen honorarium.
select
  count(*)                                              as aantal_items_met_kortingspercentage,
  count(*) filter (where korting <> round(honorarium * korting_percentage / 100, 2)) as afwijkend
from public.factuuritems
where korting_type = 'percentage' and korting_percentage is not null;

-- 3. De items met een verschil van precies een cent (maximaal 50), nieuwste eerst, zonder klantnamen.
select
  id, datum, status, qty, tarief,
  honorarium                           as opgeslagen,
  round(qty * tarief, 2)               as exact,
  round(qty * tarief, 2) - honorarium  as verschil
from public.factuuritems
where tarief is not null and abs(round(qty * tarief, 2) - honorarium) = 0.01
order by datum desc
limit 50;

-- 4. Specificaties: opgeslagen kantoorkosten tegenover een herberekening met het HUIDIGE kantoorkostenpercentage
--    van de klant (indicatief: het percentage kan sinds het aanmaken zijn gewijzigd).
with grondslag as (
  select b.id, b.totaal_kantoorkosten, k.kantoorkosten_percentage,
         coalesce(sum(i.honorarium + i.externe_kosten - i.korting) filter (where i.kantoorkosten_van_toepassing), 0) as grondslag
  from public.facturatiebatches b
  join public.klanten k on k.id = b.klant_id
  left join public.factuuritems i on i.facturatiebatch_id = b.id
  group by b.id, b.totaal_kantoorkosten, k.kantoorkosten_percentage
), herberekend as (
  select *, case when round(grondslag * kantoorkosten_percentage / 100, 2) > 0
                 then least(greatest(round(grondslag * kantoorkosten_percentage / 100, 2), 15), 200) else 0 end as nieuw
  from grondslag
)
select count(*) as aantal_specificaties, count(*) filter (where nieuw <> totaal_kantoorkosten) as afwijkend
from herberekend;
