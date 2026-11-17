import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { purgeVerweesGebruikers } from "@/actions/admin";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GebruikersTab } from "@/components/instellingen/gebruikers-tab";
import { TeamsTab } from "@/components/instellingen/teams-tab";
import { ChangelogTab } from "@/components/instellingen/changelog-tab";
import { sorteerReleasesNieuwsteEerst } from "@/lib/versie";
import { LandenTab } from "@/components/instellingen/landen-tab";
import { FunctiesTab, type FunctieRij } from "@/components/instellingen/functies-tab";
import { MeldingenTab, type MeldingRij } from "@/components/instellingen/meldingen-tab";
import { AuditlogTab, type AuditlogRij } from "@/components/instellingen/auditlog-tab";
import type { UserRole } from "@/lib/supabase/types";

export default async function InstellingenPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "beheerder") redirect("/dashboard");

  await purgeVerweesGebruikers();

  const supabase = await createClient();
  const jaar = new Date().getFullYear();
  const [
    { data: profiles },
    { data: teams },
    { data: teamMembers },
    { data: changelog },
    { data: teamdoelen },
    { data: profileRoles },
    { data: landen },
    { data: auditRijen, count: auditAantal },
    { data: opslaggrootteBytes },
    { data: functies },
    { data: functieTarieven },
    { data: meldingen },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, voornaam, achternaam, email, role, actief, initialen, functie_id")
      .order("full_name"),
    supabase.from("teams").select("id, naam, email").order("naam"),
    supabase.from("team_members").select("team_id, profile_id"),
    supabase.from("productchangelog").select("*").order("releasedatum", { ascending: false }),
    supabase.from("teamdoelen").select("team_id, bruto_bedrag, netto_bedrag").eq("jaar", jaar),
    supabase.from("profile_roles").select("profile_id, role"),
    supabase.from("landcodes").select("iso_code, naam_nl, naam_en").order("naam_nl"),
    supabase
      .from("auditlog")
      .select("id, actie, object_type, object_id, oude_waarde, nieuwe_waarde, created_at, profiles(full_name)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("auditlog_opslaggrootte"),
    supabase.from("functies").select("id, naam").order("naam"),
    supabase.from("tarieven").select("functie_id, tarief, ingangsdatum, einddatum").not("functie_id", "is", null),
    supabase
      .from("meldingen")
      .select("id, soort, tekst, wegklikbaar, actief, created_at, profiles(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  // Huidig tarief per functie: de geldige rij met de meest recente ingangsdatum.
  const vandaag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
  const tariefPerFunctie: Record<string, { tarief: number; ingangsdatum: string }> = {};
  for (const t of functieTarieven ?? []) {
    if (!t.functie_id || t.ingangsdatum > vandaag || (t.einddatum && t.einddatum < vandaag)) continue;
    const huidig = tariefPerFunctie[t.functie_id];
    if (!huidig || t.ingangsdatum > huidig.ingangsdatum) {
      tariefPerFunctie[t.functie_id] = { tarief: t.tarief, ingangsdatum: t.ingangsdatum };
    }
  }
  const functieRijen: FunctieRij[] = (functies ?? []).map((f) => ({
    id: f.id,
    naam: f.naam,
    uurtarief: tariefPerFunctie[f.id]?.tarief ?? null,
    aantalGebruikers: (profiles ?? []).filter((p) => p.functie_id === f.id).length,
  }));
  const meldingRijen: MeldingRij[] = (meldingen ?? []).map((m) => ({
    id: m.id,
    soort: m.soort,
    tekst: m.tekst,
    wegklikbaar: m.wegklikbaar,
    actief: m.actief,
    created_at: m.created_at,
    gemaaktDoor: (m.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
  }));

  const teamIdsPerProfile: Record<string, string[]> = {};
  const ledenPerTeam: Record<string, string[]> = {};
  for (const row of teamMembers ?? []) {
    (teamIdsPerProfile[row.profile_id] ??= []).push(row.team_id);
    (ledenPerTeam[row.team_id] ??= []).push(row.profile_id);
  }
  const doelPerTeam: Record<string, { bruto: number; netto: number | null }> = {};
  for (const row of teamdoelen ?? []) {
    doelPerTeam[row.team_id] = { bruto: row.bruto_bedrag, netto: row.netto_bedrag };
  }
  const rolIdsPerProfile: Record<string, UserRole[]> = {};
  for (const row of profileRoles ?? []) {
    (rolIdsPerProfile[row.profile_id] ??= []).push(row.role);
  }

  const auditlogRijen: AuditlogRij[] = (auditRijen ?? []).map((r) => ({
    id: r.id,
    actie: r.actie,
    object_type: r.object_type,
    object_id: r.object_id,
    oude_waarde: r.oude_waarde as Record<string, unknown> | null,
    nieuwe_waarde: r.nieuwe_waarde as Record<string, unknown> | null,
    created_at: r.created_at,
    gebruikerNaam: (r.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-light tracking-tight">Instellingen</h2>
        <p className="text-sm text-muted-foreground">Gebruikers, functies, teams, meldingen en de changelog beheren.</p>
      </div>
      <Tabs defaultValue="gebruikers">
        <TabsList>
          <TabsTrigger value="gebruikers">Gebruikers</TabsTrigger>
          <TabsTrigger value="functies">Functies</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="meldingen">Meldingen</TabsTrigger>
          <TabsTrigger value="landen">Landen</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="auditlog">Auditlog</TabsTrigger>
        </TabsList>
        <TabsContent value="gebruikers">
          <GebruikersTab
            profiles={profiles ?? []}
            teams={teams ?? []}
            functies={(functies ?? []).map((f) => ({ id: f.id, naam: f.naam }))}
            teamIdsPerProfile={teamIdsPerProfile}
            rolIdsPerProfile={rolIdsPerProfile}
            eigenProfielId={profile.id}
          />
        </TabsContent>
        <TabsContent value="functies">
          <FunctiesTab functies={functieRijen} />
        </TabsContent>
        <TabsContent value="meldingen">
          <MeldingenTab meldingen={meldingRijen} />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsTab
            teams={teams ?? []}
            profiles={(profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }))}
            ledenPerTeam={ledenPerTeam}
            doelPerTeam={doelPerTeam}
            jaar={jaar}
          />
        </TabsContent>
        <TabsContent value="landen">
          <LandenTab landen={landen ?? []} />
        </TabsContent>
        <TabsContent value="changelog">
          <ChangelogTab entries={sorteerReleasesNieuwsteEerst(changelog ?? [])} />
        </TabsContent>
        <TabsContent value="auditlog">
          <AuditlogTab
            rijen={auditlogRijen}
            totaalAantal={auditAantal ?? auditlogRijen.length}
            opslaggrootteBytes={opslaggrootteBytes ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
