-- Een project aanmaken kan voortaan ook rechtstreeks vanaf "Nieuw factuuritem"
-- door elke actieve gebruiker (net als een nieuwe klant aanmaken al kon) —
-- niet langer alleen beheerder/teamleider. Bewerken/deactiveren van een
-- bestaand project (via de klantpagina) blijft wel beheerder/teamleider.
drop policy "projecten_write_beheerder_of_teamleider" on public.projecten;

create policy "projecten_insert_actieve_gebruiker" on public.projecten
  for insert to authenticated
  with check (public.is_active_user());
