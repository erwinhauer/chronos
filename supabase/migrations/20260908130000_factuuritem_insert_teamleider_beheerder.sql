-- Chronos — een teamleider/beheerder kon bij het AANMAKEN van een
-- factuuritem al een teamgenoot kiezen in het Medewerker-veld (zowel
-- client- als server-side al toegestaan, zie de eerdere
-- Medewerker-altijd-zichtbaar-feature), maar de RLS insert-policy
-- (factuuritems_insert_eigen) accepteerde voor ELKE rol alleen
-- medewerker_id = auth.uid(). RLS blokkeerde de insert dan stilzwijgend
-- (code 42501) en de app toonde de misleidende foutmelding
-- "al definitief/gefactureerd" — dezelfde valkuil als eerder bij de
-- ontbrekende delete-policy voor teamleider.
--
-- Nieuwe, aanvullende policy (permissief naast de bestaande "eigen"-policy),
-- met dezelfde scope als de bestaande update-policies voor teamleider
-- (team_services_klant) resp. beheerder (onbeperkt), plus dezelfde
-- team_id-integriteitscheck als de bestaande "eigen" insert-policy.

create policy "factuuritems_insert_teamleider_beheerder" on public.factuuritems
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_role('beheerder')
      or (public.is_role('teamleider') and public.team_services_klant(klant_id))
    )
    and (
      team_id is null
      or exists (
        select 1 from public.team_members
        where team_members.team_id = factuuritems.team_id
          and team_members.profile_id = factuuritems.medewerker_id
      )
    )
  );
