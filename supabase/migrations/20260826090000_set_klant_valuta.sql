-- Elke actieve gebruiker mag de valuta van een klant wijzigen vanaf het
-- factuuritem-scherm, net als de taal (zie set_klant_taal) — de klanten-tabel
-- zelf is alleen door een beheerder te updaten (klanten_update_beheerder),
-- dus dit vraagt dezelfde security-definer-RPC-aanpak. Valuta is een vrije
-- tekstkolom (geen enum), dus de toegestane waarden worden hier bewaakt i.p.v.
-- door het kolomtype.
create function public.set_klant_valuta(target_klant_id uuid, nieuwe_valuta text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Niet toegestaan.';
  end if;
  if nieuwe_valuta not in ('EUR', 'USD') then
    raise exception 'Ongeldige valuta.';
  end if;
  update public.klanten set valuta = nieuwe_valuta where id = target_klant_id;
end;
$$;

grant execute on function public.set_klant_valuta(uuid, text) to authenticated;
