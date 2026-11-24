-- Geplande factuuritems: een item met een datum na vandaag (Amsterdamse tijd) is "gepland" en kan
-- niet definitief worden, dus ook niet in een specificatie. De interface en de server-actie
-- controleren dit al; deze trigger is het vangnet voor elk ander pad (directe API-aanroep, scripts).
--
-- Een bestaand definitief item blijft ongemoeid: alleen de overgang naar definitief wordt gecontroleerd.

create or replace function public.factuuritems_blokkeer_toekomstig_definitief()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'definitief'
     and (tg_op = 'INSERT' or old.status is distinct from 'definitief')
     and new.datum > (now() at time zone 'Europe/Amsterdam')::date then
    raise exception 'Een factuuritem met een datum in de toekomst kan nog niet definitief worden gemaakt.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger factuuritems_blokkeer_toekomstig_definitief
  before insert or update of status on public.factuuritems
  for each row execute function public.factuuritems_blokkeer_toekomstig_definitief();

comment on function public.factuuritems_blokkeer_toekomstig_definitief is
  'Blokkeert de overgang naar definitief voor een item met een datum na vandaag (Amsterdamse tijd).';
