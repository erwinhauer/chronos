-- Zolang er geen Patricia-koppeling is, moet een gebruiker die een factuuritem
-- voor een nog onbekende klant invoert die klant meteen zelf kunnen aanmaken
-- (niet meer beheerder-only). Bewerken van bestaande klanten blijft
-- beheerder-only (klanten_update_beheerder, ongewijzigd).
drop policy "klanten_write_beheerder" on public.klanten;

create policy "klanten_insert_actieve_gebruiker" on public.klanten
  for insert to authenticated
  with check (public.is_active_user());
