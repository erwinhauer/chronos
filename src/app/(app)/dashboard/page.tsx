import { Users, Receipt, PiggyBank, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ count: klantenCount }, { data: items }, { data: teamRows }] = await Promise.all([
    supabase.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabase.from("factuuritems").select("medewerker_id, honorarium, externe_kosten, korting, status, declarabel"),
    supabase.from("team_members").select("team_id, profile_id, teams(naam), profiles(full_name)"),
  ]);

  const rows = items ?? [];
  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = rows.filter((r) => isGefactureerd(r.status)).reduce((sum, r) => sum + regelbedrag(r), 0);

  const gefactureerdPerMedewerker = new Map<string, number>();
  for (const r of rows) {
    if (!isGefactureerd(r.status)) continue;
    gefactureerdPerMedewerker.set(r.medewerker_id, (gefactureerdPerMedewerker.get(r.medewerker_id) ?? 0) + regelbedrag(r));
  }

  type Team = { naam: string; leden: Map<string, string> };
  const teams = new Map<string, Team>();
  for (const row of teamRows ?? []) {
    const teamNaam = (row.teams as unknown as { naam: string } | null)?.naam ?? "Onbekend team";
    const ledenNaam = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Onbekend";
    const team = teams.get(row.team_id) ?? { naam: teamNaam, leden: new Map() };
    team.leden.set(row.profile_id, ledenNaam);
    teams.set(row.team_id, team);
  }

  const isManagement = profile?.role === "finance" || profile?.role === "beheerder";
  const zichtbareTeams = Array.from(teams.entries()).filter(
    ([, team]) => isManagement || (profile && team.leden.has(profile.id))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welkom, {profile ? firstName(profile.full_name) : ""}
          </h2>
          <p className="text-sm text-muted-foreground">Hier is een overzicht van Chronos.</p>
        </div>
        <LinkButton href="/factuuritems/nieuw">
          <Plus className="h-4 w-4" />
          Nieuw factuuritem
        </LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actieve klanten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures">{klantenCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nog te factureren</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures">{euro(nogTeFactureren)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gefactureerd</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures">{euro(gefactureerd)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gefactureerd per teamlid</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {zichtbareTeams.length > 0 ? (
            zichtbareTeams.map(([teamId, team]) => (
              <div key={teamId} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{team.naam}</h3>
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {Array.from(team.leden.entries()).map(([profileId, naam]) => (
                    <li key={profileId} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{naam}</span>
                      <span className="tabular-figures font-medium">
                        {euro(gefactureerdPerMedewerker.get(profileId) ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Nog geen teams aangemaakt.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
