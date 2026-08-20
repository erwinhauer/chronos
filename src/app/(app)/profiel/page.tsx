import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarUpload } from "@/components/profiel/avatar-upload";
import { ROLE_LABELS } from "@/lib/nav";
import type { UserRole } from "@/lib/supabase/types";

export default async function ProfielPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: profileRoles }, { data: teamRows }] = await Promise.all([
    supabase.from("profile_roles").select("role").eq("profile_id", profile.id),
    supabase.from("team_members").select("teams(naam)").eq("profile_id", profile.id),
  ]);

  const toegekendeRollen: UserRole[] = (profileRoles ?? []).map((r) => r.role);
  const teamNamen = (teamRows ?? [])
    .map((row) => (row.teams as { naam: string } | null)?.naam)
    .filter((naam): naam is string => Boolean(naam));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Profiel</h2>
        <p className="text-sm text-muted-foreground">Je gegevens en profielfoto.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Profielfoto</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload profile={profile} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Gegevens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Naam</span>
            <span className="text-sm">{profile.full_name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">E-mailadres</span>
            <span className="text-sm">{profile.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Team(s)</span>
            {teamNamen.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {teamNamen.map((naam) => (
                  <Badge key={naam} variant="secondary" className="text-xs">
                    {naam}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Toegekende rollen</span>
            <div className="flex flex-wrap gap-1">
              {toegekendeRollen.map((role) => (
                <Badge key={role} variant={role === profile.role ? "default" : "outline"} className="text-xs">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Naam, team en rol kunnen alleen door een beheerder aangepast worden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
