-- Wijzigingslog per factuuritem — op veldniveau, zodat op het bewerkscherm
-- getoond kan worden wie wat heeft aangepast. Bewaartermijn: 6 maanden (lang
-- genoeg om "wie heeft dit laatst aangepast en waarom klopt het bedrag niet"
-- te kunnen navragen, kort genoeg om de tabel niet onbeperkt te laten groeien
-- — dit is een werklog, geen fiscale/juridische bewaarplicht).
create table public.factuuritem_wijzigingen (
  id uuid primary key default gen_random_uuid(),
  factuuritem_id uuid not null references public.factuuritems(id) on delete cascade,
  gewijzigd_door uuid not null references public.profiles(id),
  veld text not null,
  oude_waarde text,
  nieuwe_waarde text,
  aangemaakt_op timestamptz not null default now()
);

comment on table public.factuuritem_wijzigingen is
  'Veldniveau-wijzigingslog per factuuritem. Rijen ouder dan 6 maanden mogen altijd verwijderd worden (zie de delete-policy) — opruimen gebeurt lazy, bij elke volgende bewerking van een willekeurig factuuritem.';

create index factuuritem_wijzigingen_factuuritem_id_idx on public.factuuritem_wijzigingen(factuuritem_id);

alter table public.factuuritem_wijzigingen enable row level security;

-- Wie het factuuritem zelf mag zien (factuuritems_select_scope), mag ook de
-- log ervan zien — geen los rollenstelsel nodig, de subquery hergebruikt de
-- RLS van factuuritems.
create policy "factuuritem_wijzigingen_select_via_parent" on public.factuuritem_wijzigingen
  for select to authenticated using (
    exists (select 1 from public.factuuritems fi where fi.id = factuuritem_wijzigingen.factuuritem_id)
  );

create policy "factuuritem_wijzigingen_insert_eigen" on public.factuuritem_wijzigingen
  for insert to authenticated with check (
    gewijzigd_door = auth.uid()
    and exists (select 1 from public.factuuritems fi where fi.id = factuuritem_wijzigingen.factuuritem_id)
  );

-- Alleen verlopen rijen mogen verwijderd worden — door wie dan ook, want dit
-- is puur opruimen, geen inhoudelijke wijziging.
create policy "factuuritem_wijzigingen_delete_verlopen" on public.factuuritem_wijzigingen
  for delete to authenticated using (aangemaakt_op < now() - interval '6 months');
