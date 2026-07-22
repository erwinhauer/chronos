-- Chronos — Row Level Security + auditlogging
-- Uitgangspunt: server-side/database controles zijn de enige beveiligingslaag (briefing §13).

-- ============================================================================
-- Helperfuncties: rol en actief van de ingelogde gebruiker (security definer
-- zodat ze zelf niet vastlopen in RLS op profiles).
-- ============================================================================

create function public.current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select actief from public.profiles where id = auth.uid()), false);
$$;

create function public.is_role(target user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user() and public.current_role_name() = target;
$$;

-- ============================================================================
-- Generieke audit-trigger (append-only, security definer — bypast RLS op auditlog)
-- ============================================================================

create function public.write_auditlog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Losse INSERT per TG_OP: voorkomt runtime-fouten door veldverwijzingen op
  -- OLD/NEW voor tabellen zonder die kolom (bv. terugstuur_reden bestaat
  -- alleen op registraties). to_jsonb(record) en het ->> operatorpad zijn
  -- altijd veilig, ook wanneer de sleutel niet bestaat.
  if TG_OP = 'INSERT' then
    insert into public.auditlog (gebruiker_id, actie, object_type, object_id, nieuwe_waarde, reden)
    values (auth.uid(), 'aanmaken', TG_TABLE_NAME, new.id, to_jsonb(new), to_jsonb(new) ->> 'terugstuur_reden');
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.auditlog (gebruiker_id, actie, object_type, object_id, oude_waarde, nieuwe_waarde, reden)
    values (auth.uid(), 'wijzigen', TG_TABLE_NAME, new.id, to_jsonb(old), to_jsonb(new), to_jsonb(new) ->> 'terugstuur_reden');
    return new;
  else
    insert into public.auditlog (gebruiker_id, actie, object_type, object_id, oude_waarde)
    values (auth.uid(), 'wijzigen', TG_TABLE_NAME, old.id, to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger trg_audit_klanten
  after insert or update on public.klanten
  for each row execute function public.write_auditlog();

create trigger trg_audit_dossiers
  after insert or update on public.dossiers
  for each row execute function public.write_auditlog();

create trigger trg_audit_tarieven
  after insert or update on public.tarieven
  for each row execute function public.write_auditlog();

create trigger trg_audit_registraties
  after insert or update on public.registraties
  for each row execute function public.write_auditlog();

create trigger trg_audit_facturatiebatches
  after insert or update on public.facturatiebatches
  for each row execute function public.write_auditlog();

-- ============================================================================
-- RLS inschakelen
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.klanten enable row level security;
alter table public.dossiers enable row level security;
alter table public.tarieven enable row level security;
alter table public.registraties enable row level security;
alter table public.facturatiebatches enable row level security;
alter table public.specificaties enable row level security;
alter table public.auditlog enable row level security;
alter table public.productchangelog enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: iedereen mag collega's zien (namen tonen in dropdowns/overzichten);
-- alleen zichzelf of beheerder mag wijzigen.
-- ---------------------------------------------------------------------------

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_self_or_beheerder" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_role('beheerder'))
  with check (id = auth.uid() or public.is_role('beheerder'));

create policy "profiles_insert_beheerder" on public.profiles
  for insert to authenticated
  with check (public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- klanten: iedereen mag lezen (nodig voor dropdown); alleen beheerder beheert.
-- ---------------------------------------------------------------------------

create policy "klanten_select_authenticated" on public.klanten
  for select to authenticated using (public.is_active_user());

create policy "klanten_write_beheerder" on public.klanten
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "klanten_update_beheerder" on public.klanten
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- dossiers: iedereen mag lezen; medewerker mag nieuw dossier aanmaken;
-- wijzigen door beheerder of de teamleider van het dossier.
-- ---------------------------------------------------------------------------

create policy "dossiers_select_authenticated" on public.dossiers
  for select to authenticated using (public.is_active_user());

create policy "dossiers_insert_authenticated" on public.dossiers
  for insert to authenticated with check (public.is_active_user());

create policy "dossiers_update_teamleider_of_beheerder" on public.dossiers
  for update to authenticated
  using (public.is_role('beheerder') or teamleider_id = auth.uid())
  with check (public.is_role('beheerder') or teamleider_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tarieven: iedereen mag lezen (voor tariefvoorstel); alleen beheerder beheert
-- het centrale tarief. Handmatige afwijking gebeurt op de registratie zelf.
-- ---------------------------------------------------------------------------

create policy "tarieven_select_authenticated" on public.tarieven
  for select to authenticated using (public.is_active_user());

create policy "tarieven_write_beheerder" on public.tarieven
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "tarieven_update_beheerder" on public.tarieven
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- registraties — kern van de autorisatieregel (briefing §3):
-- medewerker: eigen regels, vrij te wijzigen zolang niet goedgekeurd/gefactureerd;
-- teamleider: regels van dossiers waar hij/zij teamleider van is;
-- finance/beheerder: alles.
-- ---------------------------------------------------------------------------

create policy "registraties_select_scope" on public.registraties
  for select to authenticated using (
    public.is_active_user() and (
      medewerker_id = auth.uid()
      or public.is_role('finance')
      or public.is_role('beheerder')
      or exists (
        select 1 from public.dossiers d
        where d.id = registraties.dossier_id and d.teamleider_id = auth.uid()
      )
    )
  );

create policy "registraties_insert_eigen" on public.registraties
  for insert to authenticated
  with check (public.is_active_user() and medewerker_id = auth.uid());

create policy "registraties_update_medewerker_concept" on public.registraties
  for update to authenticated
  using (
    public.is_active_user() and medewerker_id = auth.uid()
    and status in ('concept', 'teruggestuurd')
  )
  with check (medewerker_id = auth.uid());

create policy "registraties_update_teamleider_goedkeuring" on public.registraties
  for update to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.dossiers d
      where d.id = registraties.dossier_id and d.teamleider_id = auth.uid()
    )
    and status in ('ingediend', 'goedgekeurd')
  )
  with check (
    exists (
      select 1 from public.dossiers d
      where d.id = registraties.dossier_id and d.teamleider_id = auth.uid()
    )
  );

create policy "registraties_update_finance_beheerder" on public.registraties
  for update to authenticated
  using (public.is_role('finance') or public.is_role('beheerder'))
  with check (public.is_role('finance') or public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- facturatiebatches en specificaties: finance/teamleider/beheerder.
-- ---------------------------------------------------------------------------

create policy "batches_select_scope" on public.facturatiebatches
  for select to authenticated using (
    public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider')
  );

create policy "batches_write_finance_beheerder" on public.facturatiebatches
  for insert to authenticated with check (public.is_role('finance') or public.is_role('beheerder'));

create policy "batches_update_finance_teamleider_beheerder" on public.facturatiebatches
  for update to authenticated
  using (public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider'))
  with check (public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider'));

create policy "specificaties_select_scope" on public.specificaties
  for select to authenticated using (
    public.is_role('finance') or public.is_role('beheerder') or public.is_role('teamleider')
  );

create policy "specificaties_write_finance_beheerder" on public.specificaties
  for insert to authenticated with check (public.is_role('finance') or public.is_role('beheerder'));

create policy "specificaties_update_finance_beheerder" on public.specificaties
  for update to authenticated
  using ((public.is_role('finance') or public.is_role('beheerder')) and vergrendeld = false)
  with check (public.is_role('finance') or public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- auditlog: uitsluitend beheerder mag lezen; niemand (buiten de trigger, die
-- als tabel-eigenaar via SECURITY DEFINER RLS omzeilt) mag rechtstreeks schrijven.
-- ---------------------------------------------------------------------------

create policy "auditlog_select_beheerder" on public.auditlog
  for select to authenticated using (public.is_role('beheerder'));

-- ---------------------------------------------------------------------------
-- productchangelog: leesbaar voor alle geauthenticeerde gebruikers, beheer door beheerder.
-- ---------------------------------------------------------------------------

create policy "changelog_select_authenticated" on public.productchangelog
  for select to authenticated using (true);

create policy "changelog_write_beheerder" on public.productchangelog
  for insert to authenticated with check (public.is_role('beheerder'));

create policy "changelog_update_beheerder" on public.productchangelog
  for update to authenticated
  using (public.is_role('beheerder'))
  with check (public.is_role('beheerder'));
