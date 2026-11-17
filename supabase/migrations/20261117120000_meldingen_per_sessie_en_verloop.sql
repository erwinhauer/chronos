-- Meldingen: verloopdatum, en een wegklikbare melding wordt één keer per inlogsessie getoond.
--
-- Een melding krijgt een optioneel moment waarop hij niet meer wordt getoond (`verloopt_op`).
-- "Weggeklikt" (permanent per gebruiker) wordt vervangen door "gezien in deze inlogsessie":
-- een wegklikbare melding verschijnt na het inloggen één keer en komt in dezelfde sessie niet
-- terug. De sessie is de `session_id` uit het Supabase-token; na opnieuw inloggen is dat een
-- nieuwe sessie, dus dan verschijnt de melding weer. Niet-wegklikbare meldingen blijven altijd staan.
--
-- De oude tabel bevatte alleen testgegevens van de eerste versie en wordt vervangen.

drop table public.melding_gesloten;

alter table public.meldingen
  add column verloopt_op timestamptz;

comment on column public.meldingen.verloopt_op is 'Vanaf dit moment wordt de melding niet meer getoond. Leeg = verloopt niet.';

create table public.melding_gezien (
  melding_id uuid not null references public.meldingen (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  sessie_id text not null,
  gezien_op timestamptz not null default now(),
  primary key (melding_id, profile_id, sessie_id)
);

comment on table public.melding_gezien is 'Welke gebruiker een wegklikbare melding in welke inlogsessie al heeft gezien.';

alter table public.melding_gezien enable row level security;

create policy "melding_gezien_select_eigen" on public.melding_gezien
  for select to authenticated using (profile_id = auth.uid());

create policy "melding_gezien_insert_eigen" on public.melding_gezien
  for insert to authenticated
  with check (profile_id = auth.uid() and public.is_active_user());

-- Een beheerder wist ze na het wijzigen of heractiveren van een melding, zodat iedereen hem weer ziet.
create policy "melding_gezien_delete_beheerder" on public.melding_gezien
  for delete to authenticated using (public.is_role('beheerder'));

-- Gebruikers zien alleen actieve meldingen die niet verlopen zijn; een beheerder ziet alles.
drop policy "meldingen_select" on public.meldingen;

create policy "meldingen_select" on public.meldingen
  for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_role('beheerder')
      or (actief and (verloopt_op is null or verloopt_op > now()))
    )
  );
