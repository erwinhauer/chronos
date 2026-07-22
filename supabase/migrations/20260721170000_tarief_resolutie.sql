-- Chronos — tariefresolutie (briefing §7.1)
-- Prioriteit: klant+medewerker > medewerker (algemeen) > klant (algemeen) > algemeen tarief.
-- Binnen een prioriteitsniveau geldt het tarief met de meest recente ingangsdatum die nog geldig is.

create function public.resolve_tarief(p_klant_id uuid, p_medewerker_id uuid, p_datum date)
returns numeric
language sql
stable
as $$
  select tarief
  from public.tarieven
  where ingangsdatum <= p_datum
    and (einddatum is null or einddatum >= p_datum)
    and (
      (klant_id = p_klant_id and medewerker_id = p_medewerker_id)
      or (klant_id is null and medewerker_id = p_medewerker_id)
      or (klant_id = p_klant_id and medewerker_id is null)
      or (klant_id is null and medewerker_id is null)
    )
  order by
    case
      when klant_id = p_klant_id and medewerker_id = p_medewerker_id then 0
      when klant_id is null and medewerker_id = p_medewerker_id then 1
      when klant_id = p_klant_id and medewerker_id is null then 2
      else 3
    end,
    ingangsdatum desc
  limit 1;
$$;

comment on function public.resolve_tarief is 'Bepaalt het meest specifieke geldige tarief voor klant+medewerker op een datum (§7.1). Retourneert null als er geen tarief van toepassing is.';
