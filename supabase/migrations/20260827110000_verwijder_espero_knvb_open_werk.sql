-- Eenmalige opschoning op verzoek: nog niet-gefactureerd werk (factuuritems
-- met status 'aangemaakt') van Espero B.V. en de KNVB verwijderen. Al
-- gefactureerde/definitieve regels blijven bewust staan (financiële/audit-
-- bescherming, dezelfde grens die de rest van de app ook altijd aanhoudt),
-- en de klantrecords zelf blijven bestaan.
--
-- Facturatiebatches/specificaties worden hier bewust niet aangeraakt: een
-- facturatiebatch wordt in deze app alleen aangemaakt via genereerSpecificatie()
-- (src/actions/specificaties.ts), en dat gebeurt altijd atomisch met
-- status = 'gefactureerd' — er bestaat geen "nog niet gefactureerde" batch om
-- te verwijderen zonder de gefactureerde-werk-grens hierboven te doorbreken.
--
-- Faalt bewust hard (raise exception, stopt de hele deploy) als een van de
-- twee klantnamen méér dan één keer wordt gevonden — een dubbele match mag
-- hier nooit stilzwijgend de foute rijen raken. Geen enkele match (0) is
-- juist geen fout: dat is de normale situatie op een omgeving waar deze
-- klanten nooit hebben bestaan (bv. een verse BETA/TEST-database) of waar
-- deze opschoning al eerder is toegepast — daar is dit dan bewust een no-op.
do $$
declare
  espero_id uuid;
  knvb_id uuid;
  espero_count int;
  knvb_count int;
  verwijderd_espero int;
  verwijderd_knvb int;
begin
  select count(*) into espero_count from public.klanten where naam ilike '%espero%';
  select count(*) into knvb_count from public.klanten where naam ilike '%voetbalbond%';

  if espero_count > 1 then
    raise exception 'Verwacht hoogstens 1 klant met naam ILIKE %%espero%%, gevonden: %', espero_count;
  end if;
  if knvb_count > 1 then
    raise exception 'Verwacht hoogstens 1 klant met naam ILIKE %%voetbalbond%%, gevonden: %', knvb_count;
  end if;
  if espero_count = 0 and knvb_count = 0 then
    raise notice 'Geen Espero B.V. of KNVB-klant gevonden — niets op te schonen (no-op).';
    return;
  end if;

  select id into espero_id from public.klanten where naam ilike '%espero%';
  select id into knvb_id from public.klanten where naam ilike '%voetbalbond%';

  -- factuuritem_dossiers en factuuritem_wijzigingen cascaden mee (on delete cascade).
  with verwijderd as (
    delete from public.factuuritems
    where klant_id = espero_id and status = 'aangemaakt'
    returning id
  )
  select count(*) into verwijderd_espero from verwijderd;

  with verwijderd as (
    delete from public.factuuritems
    where klant_id = knvb_id and status = 'aangemaakt'
    returning id
  )
  select count(*) into verwijderd_knvb from verwijderd;

  raise notice 'Espero B.V. (id %): % niet-gefactureerde factuuritems verwijderd.', espero_id, verwijderd_espero;
  raise notice 'KNVB (id %): % niet-gefactureerde factuuritems verwijderd.', knvb_id, verwijderd_knvb;

  -- Defensief: als er ooit toch een facturatiebatch zou bestaan die niet
  -- 'gefactureerd' is (nu niet mogelijk via de app), ruim die en zijn
  -- specificaties dan ook op — anders is dit een no-op.
  delete from public.specificaties
  where facturatiebatch_id in (
    select id from public.facturatiebatches
    where klant_id in (espero_id, knvb_id) and status <> 'gefactureerd'
  );

  delete from public.facturatiebatches
  where klant_id in (espero_id, knvb_id) and status <> 'gefactureerd';
end $$;
