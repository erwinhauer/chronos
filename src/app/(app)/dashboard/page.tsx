import { Users, Receipt, PiggyBank, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { OmzetGrafiek, type OmzetRij } from "@/components/omzet-grafiek";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatIcon } from "@/components/stat-icon";
import { LinkButton } from "@/components/link-button";

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAX_SERIES = 5;

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const huidigJaar = new Date().getFullYear();

  const [{ count: klantenCount }, { data: items }, { data: teamdoelen }, { data: teamMembers }] = await Promise.all([
    supabase.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabase
      .from("factuuritems")
      .select(
        "medewerker_id, honorarium, externe_kosten, korting, status, declarabel, datum, profiles!factuuritems_medewerker_id_fkey(full_name)"
      ),
    supabase.from("teamdoelen").select("bedrag, teams(id, naam)").eq("jaar", huidigJaar),
    supabase.from("team_members").select("team_id, profile_id"),
  ]);

  const rows = items ?? [];
  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = rows.filter((r) => isGefactureerd(r.status)).reduce((sum, r) => sum + regelbedrag(r), 0);

  const ditJaar = rows.filter((r) => isGefactureerd(r.status) && new Date(r.datum).getFullYear() === huidigJaar);
  const totaalDitJaar = ditJaar.reduce((sum, r) => sum + regelbedrag(r), 0);

  const ledenPerTeam = new Map<string, Set<string>>();
  for (const lid of teamMembers ?? []) {
    (ledenPerTeam.get(lid.team_id) ?? ledenPerTeam.set(lid.team_id, new Set()).get(lid.team_id)!).add(lid.profile_id);
  }
  const teamVoortgang = (teamdoelen ?? [])
    .map((d) => {
      const team = d.teams as unknown as { id: string; naam: string } | null;
      if (!team) return null;
      const leden = ledenPerTeam.get(team.id) ?? new Set();
      const gefactureerd = ditJaar
        .filter((r) => leden.has(r.medewerker_id))
        .reduce((sum, r) => sum + regelbedrag(r), 0);
      return { teamNaam: team.naam, doel: d.bedrag, gefactureerd };
    })
    .filter((v): v is { teamNaam: string; doel: number; gefactureerd: number } => v !== null)
    .sort((a, b) => a.teamNaam.localeCompare(b.teamNaam));

  const totaalPerMedewerker = new Map<string, { naam: string; totaal: number }>();
  for (const r of ditJaar) {
    const naam = (r.profiles as unknown as { full_name: string } | null)?.full_name ?? "Onbekend";
    const bestaand = totaalPerMedewerker.get(r.medewerker_id) ?? { naam, totaal: 0 };
    bestaand.totaal += regelbedrag(r);
    totaalPerMedewerker.set(r.medewerker_id, bestaand);
  }

  // Vaste, alfabetische volgorde (nooit op waarde gesorteerd — anders verschuiven kleuren
  // van betekenis tussen renders). Boven de 5 series vouwen de kleinste samen tot "Overig".
  const gesorteerdOpNaam = Array.from(totaalPerMedewerker.entries()).sort((a, b) =>
    a[1].naam.localeCompare(b[1].naam)
  );
  const topMedewerkers = gesorteerdOpNaam.slice(0, MAX_SERIES).map(([id, v]) => ({ id, naam: v.naam }));
  const overigeIds = new Set(gesorteerdOpNaam.slice(MAX_SERIES).map(([id]) => id));
  const medewerkerNamen = topMedewerkers.map((m) => m.naam).concat(overigeIds.size > 0 ? ["Overig"] : []);

  const chartData: OmzetRij[] = MAANDEN.map((maand) => {
    const rij: OmzetRij = { maand };
    for (const m of topMedewerkers) rij[m.naam] = 0;
    if (overigeIds.size > 0) rij["Overig"] = 0;
    return rij;
  });

  for (const r of ditJaar) {
    const maandIndex = new Date(r.datum).getMonth();
    const naam = overigeIds.has(r.medewerker_id)
      ? "Overig"
      : topMedewerkers.find((m) => m.id === r.medewerker_id)?.naam;
    if (!naam) continue;
    chartData[maandIndex][naam] = (chartData[maandIndex][naam] as number) + regelbedrag(r);
  }

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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={Users} tint="primary" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Actieve klanten</p>
              <div className="text-2xl font-semibold tabular-figures">{klantenCount ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={Receipt} tint="warning" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nog te factureren</p>
              <div className="text-2xl font-semibold tabular-figures text-warning">{euro(nogTeFactureren)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={PiggyBank} tint="success" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Gefactureerd</p>
              <div className="text-2xl font-semibold tabular-figures text-success">{euro(gefactureerd)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {teamVoortgang.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Teamdoelen {huidigJaar}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {teamVoortgang.map((t) => (
              <div key={t.teamNaam} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.teamNaam}</span>
                  <span className="tabular-figures text-muted-foreground">
                    {euro(t.gefactureerd)} / {euro(t.doel)}
                  </span>
                </div>
                <Progress value={t.doel > 0 ? (t.gefactureerd / t.doel) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Omzet per teamlid</CardTitle>
            <p className="text-sm text-muted-foreground">Gefactureerd per maand, {huidigJaar}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Totaal {huidigJaar}</p>
            <p className="text-xl font-semibold tabular-figures">{euro(totaalDitJaar)}</p>
          </div>
        </CardHeader>
        <CardContent>
          {medewerkerNamen.length > 0 ? (
            <OmzetGrafiek data={chartData} medewerkerNamen={medewerkerNamen} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nog geen gefactureerde factuuritems in {huidigJaar}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
