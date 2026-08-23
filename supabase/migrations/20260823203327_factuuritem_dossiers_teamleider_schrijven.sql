-- factuuritems_update_teamleider_factureren staat een teamleider al toe om een
-- factuuritem van een teamgenoot te bewerken (o.a. om de medewerker te kunnen
-- wijzigen), maar factuuritem_dossiers_write_via_parent kende die rol nog niet
-- — updateFactuurItem vervangt de dossierregels altijd (delete+insert), dus
-- zonder deze aanvulling faalt elke bewerking van een teamgenoot-item op het
-- dossiernummer-gedeelte, ook als de rest van de update wel slaagt.
drop policy "factuuritem_dossiers_write_via_parent" on public.factuuritem_dossiers;

create policy "factuuritem_dossiers_write_via_parent" on public.factuuritem_dossiers
  for all to authenticated using (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (
          fi.medewerker_id = auth.uid()
          or public.is_role('finance')
          or public.is_role('beheerder')
          or (public.is_role('teamleider') and public.team_services_klant(fi.klant_id))
        )
        and fi.status = 'aangemaakt'
    )
  ) with check (
    exists (
      select 1 from public.factuuritems fi
      where fi.id = factuuritem_dossiers.factuuritem_id
        and (
          fi.medewerker_id = auth.uid()
          or public.is_role('finance')
          or public.is_role('beheerder')
          or (public.is_role('teamleider') and public.team_services_klant(fi.klant_id))
        )
    )
  );
