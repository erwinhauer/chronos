-- HubSpot-import: bij een klant die al bestaat, mag elke actieve gebruiker
-- ontbrekende adres/PNN-gegevens laten aanvullen vanuit HubSpot (nooit een
-- al ingevuld veld overschrijven) — net als set_klant_taal/set_klant_valuta.
-- klanten zelf is en blijft beheerder-only te updaten (klanten_update_beheerder),
-- dus dit vraagt dezelfde security-definer-RPC-aanpak; anders faalt dit voor
-- iedere niet-beheerder met "Bijwerken van de klant is mislukt."
create function public.supplement_klant_vanuit_hubspot(
  target_klant_id uuid,
  nieuw_adres text,
  nieuwe_patricia_id text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Niet toegestaan.';
  end if;
  update public.klanten
  set
    adres = coalesce(adres, nieuw_adres),
    patricia_id = coalesce(patricia_id, nieuwe_patricia_id)
  where id = target_klant_id;
end;
$$;

grant execute on function public.supplement_klant_vanuit_hubspot(uuid, text, text) to authenticated;
