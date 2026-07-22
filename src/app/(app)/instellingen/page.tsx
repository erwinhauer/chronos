import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GebruikersTab } from "@/components/instellingen/gebruikers-tab";
import { TeamsTab } from "@/components/instellingen/teams-tab";
import { ChangelogTab } from "@/components/instellingen/changelog-tab";

export default async function InstellingenPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "beheerder") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: profiles }, { data: teams }, { data: teamMembers }, { data: changelog }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, actief").order("full_name"),
    supabase.from("teams").select("id, naam").order("naam"),
    supabase.from("team_members").select("team_id, profile_id"),
    supabase.from("productchangelog").select("*").order("releasedatum", { ascending: false }),
  ]);

  const teamIdsPerProfile: Record<string, string[]> = {};
  const ledenPerTeam: Record<string, string[]> = {};
  for (const row of teamMembers ?? []) {
    (teamIdsPerProfile[row.profile_id] ??= []).push(row.team_id);
    (ledenPerTeam[row.team_id] ??= []).push(row.profile_id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Instellingen</h2>
        <p className="text-sm text-muted-foreground">Gebruikers, teams en de changelog beheren.</p>
      </div>
      <Tabs defaultValue="gebruikers">
        <TabsList>
          <TabsTrigger value="gebruikers">Gebruikers</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>
        <TabsContent value="gebruikers">
          <GebruikersTab profiles={profiles ?? []} teams={teams ?? []} teamIdsPerProfile={teamIdsPerProfile} />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsTab
            teams={teams ?? []}
            profiles={(profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }))}
            ledenPerTeam={ledenPerTeam}
          />
        </TabsContent>
        <TabsContent value="changelog">
          <ChangelogTab entries={changelog ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
