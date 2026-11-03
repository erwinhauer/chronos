-- Chronos — het moment waarop een factuuritem definitief is geworden, op het item zelf.
--
-- De DWO (doorlooptijd van werkzaamheid tot omzet) was tot nu toe afgeleid van
-- facturatiebatches.goedgekeurd_op via het koppelen van het item aan zijn batch. Door het
-- moment op het item zelf vast te leggen is de DWO per item een vaststaand feit: het
-- verandert niet als een batch later anders wordt ingericht en is direct per item en per
-- maand uit te lezen (DWO-trend op het dashboard).
alter table public.factuuritems add column definitief_op timestamptz;

comment on column public.factuuritems.definitief_op is
  'Moment waarop het item definitief is geworden (opgenomen in een specificatie). Wordt gezet bij de overgang naar status definitief en leeggemaakt als het item weer aangemaakt is. Basis voor de DWO.';

-- Bestaande definitieve items: het goedkeurmoment van hun specificatie. De trigger die
-- laatst_bewerkt_door zet staat er even uit, anders zou deze backfill dat veld bij elk
-- bestaand item leegmaken (in een migratie is er geen auth.uid()).
alter table public.factuuritems disable trigger trg_factuuritems_laatst_bewerkt_door;

update public.factuuritems fi
  set definitief_op = fb.goedgekeurd_op
  from public.facturatiebatches fb
  where fi.facturatiebatch_id = fb.id
    and fi.status = 'definitief'
    and fb.goedgekeurd_op is not null;

alter table public.factuuritems enable trigger trg_factuuritems_laatst_bewerkt_door;

-- Vangnet voor elke route die een item definitief maakt: de applicatie geeft het moment mee,
-- maar ook zonder wordt het hier gezet. Niet-definitieve items hebben nooit een moment.
create or replace function public.factuuritems_zet_definitief_op()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'definitief' then
    if new.definitief_op is null then
      new.definitief_op := now();
    end if;
  else
    new.definitief_op := null;
  end if;
  return new;
end;
$$;

create trigger factuuritems_zet_definitief_op
  before insert or update of status, definitief_op on public.factuuritems
  for each row execute function public.factuuritems_zet_definitief_op();

create index factuuritems_definitief_op_idx on public.factuuritems(definitief_op)
  where definitief_op is not null;
