-- factuuritems_update_teamgenoot (vorige migratie) liet een medewerker al een
-- teamgenoot-item bewerken, maar factuuritem_dossiers had zijn eigen,
-- aparte RLS-policy (factuuritem_dossiers_write_via_parent) die deze
-- teamgenoot-scoping nog niet kende — met als gevolg dat de dossiernummers
-- van zo'n item niet konden worden bijgewerkt (updateFactuurItem doet altijd
-- een delete+insert van factuuritem_dossiers naast de update van het item
-- zelf). Zelfde teamgenoot-voorwaarde als factuuritems_update_teamgenoot:
-- het item hoort bij een team waar de kijker zelf ook lid van is.
create policy "factuuritem_dossiers_write_teamgenoot" on public.factuuritem_dossiers
  for all to authenticated
  using (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and fi.status = 'aangemaakt'
        and fi.team_id is not null
        and exists (
          select 1 from public.team_members tm
          where tm.team_id = fi.team_id and tm.profile_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and fi.team_id is not null
        and exists (
          select 1 from public.team_members tm
          where tm.team_id = fi.team_id and tm.profile_id = auth.uid()
        )
    )
  );
