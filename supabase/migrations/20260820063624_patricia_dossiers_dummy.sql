-- Chronos — tijdelijke dummy-vervanging voor de nog te bouwen Patricia-koppeling.
-- Puur input-UX (typeahead-bron) voor de dossierselectie bij een nieuw factuuritem —
-- vervangt NIET de op 22 juli 2026 verwijderde "dossiers"-tabel als eerste-klas
-- entiteit; type_dienst/land blijven afgeleid via parseDossiernummer() zoals nu.

create table public.patricia_dossiers (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references public.klanten (id),
  dossiernummer text not null,
  matter_naam text not null,
  actief boolean not null default true,
  created_at timestamptz not null default now(),
  unique (klant_id, dossiernummer)
);

comment on table public.patricia_dossiers is 'Tijdelijke dummy-kopie van dossiers uit Patricia (extern zaaksysteem, nog niet geïntegreerd). Uitsluitend input-UX (typeahead-bron) voor factuuritems.';

create index idx_patricia_dossiers_klant on public.patricia_dossiers (klant_id);

alter table public.patricia_dossiers enable row level security;

create policy "patricia_dossiers_select_authenticated" on public.patricia_dossiers
  for select to authenticated using (public.is_active_user());

create policy "patricia_dossiers_write_beheerder" on public.patricia_dossiers
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "patricia_dossiers_update_beheerder" on public.patricia_dossiers
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

grant all on public.patricia_dossiers to anon, authenticated, service_role;
