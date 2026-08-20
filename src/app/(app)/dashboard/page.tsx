import { Users, Receipt, PiggyBank, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { parsePeriodeKey, periodeLabel, inPeriode } from "@/lib/omzet-periode";
import { OmzetGrafiek, type OmzetRij } from "@/components/omzet-grafiek";
import { PeriodeSelect } from "@/components/periode-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatIcon } from "@/components/stat-icon";
import { LinkButton } from "@/components/link-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAX_SERIES = 5;

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

function buildOmzetGrafiekData(
  ditJaar: { medewerker_id: string; datum: string; honorarium: number; externe_kosten: number; korting: number }[],
  namenPerId: Map<string, string>
) {
  const totaalPerMedewerker = new Map<string, { naam: string; totaal: number }>();
  for (const r of ditJaar) {
    const naam = namenPerId.get(r.medewerker_id) ?? "Onbekend";
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

  return { chartData, medewerkerNamen };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode = parsePeriodeKey(periodeParam);

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const huidigJaar = new Date().getFullYear();

  const [{ count: klantenCount }, { data: items }, { data: teamdoelen }, { data: teamMembers }, { data: profiles }] =
    await Promise.all([
      supabase.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
      supabase
        .from("factuuritems")
        .select(
          "medewerker_id, klant_id, honorarium, externe_kosten, korting, status, declarabel, datum, prijstype, klanten(naam)"
        ),
      supabase.from("teamdoelen").select("bruto_bedrag, netto_bedrag, teams(id, naam)").eq("jaar", huidigJaar),
      supabase.from("team_members").select("team_id, profile_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const rows = items ?? [];
  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = rows.filter((r) => isGefactureerd(r.status)).reduce((sum, r) => sum + regelbedrag(r), 0);

  const ditJaar = rows.filter((r) => isGefactureerd(r.status) && new Date(r.datum).getFullYear() === huidigJaar);
  // Periode-gefilterd (voor de nieuwe bruto-/uren-omzet-uitsplitsingen) — los van
  // "ditJaar", dat altijd het volledige lopende jaar blijft voor de on-target-berekening.
  const inGekozenPeriode = ditJaar.filter((r) => inPeriode(r.datum, periode, huidigJaar));
  const inGekozenPeriodeUren = inGekozenPeriode.filter((r) => r.prijstype === "uren");

  const namenPerId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const ledenPerTeam = new Map<string, Set<string>>();
  for (const lid of teamMembers ?? []) {
    (ledenPerTeam.get(lid.team_id) ?? ledenPerTeam.set(lid.team_id, new Set()).get(lid.team_id)!).add(lid.profile_id);
  }

  // Teamdoelen: finance/beheerder/directie zien alle teams (zelfde scheiding als
  // factuuritems_select_scope), medewerker/teamleider alleen hun eigen team(s).
  const zietAlleTeams =
    profile?.role === "finance" || profile?.role === "beheerder" || profile?.role === "directie";
  const eigenTeamIds = new Set(
    (teamMembers ?? []).filter((lid) => lid.profile_id === profile?.id).map((lid) => lid.team_id)
  );

  const teamKaarten = (teamdoelen ?? [])
    .map((d) => {
      const team = d.teams as unknown as { id: string; naam: string } | null;
      if (!team) return null;
      if (!zietAlleTeams && !eigenTeamIds.has(team.id)) return null;

      const leden = ledenPerTeam.get(team.id) ?? new Set();
      const gefactureerdDitJaar = ditJaar
        .filter((r) => leden.has(r.medewerker_id))
        .reduce((sum, r) => sum + regelbedrag(r), 0);

      const teamItemsInPeriode = inGekozenPeriode.filter((r) => leden.has(r.medewerker_id));
      const teamItemsUrenInPeriode = inGekozenPeriodeUren.filter((r) => leden.has(r.medewerker_id));
      const brutoOmzetTeam = teamItemsInPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);
      const urenOmzetTeam = teamItemsUrenInPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);

      const perTeamlid = new Map<string, { naam: string; bruto: number; uren: number }>();
      for (const lidId of leden) {
        perTeamlid.set(lidId, { naam: namenPerId.get(lidId) ?? "Onbekend", bruto: 0, uren: 0 });
      }
      for (const r of teamItemsInPeriode) {
        const rij = perTeamlid.get(r.medewerker_id);
        if (rij) rij.bruto += regelbedrag(r);
      }
      for (const r of teamItemsUrenInPeriode) {
        const rij = perTeamlid.get(r.medewerker_id);
        if (rij) rij.uren += regelbedrag(r);
      }
      const teamlidRijen = Array.from(perTeamlid.values()).sort((a, b) => b.bruto - a.bruto);

      const teamLeden = ditJaar.filter((r) => leden.has(r.medewerker_id));
      const { chartData, medewerkerNamen } = buildOmzetGrafiekData(teamLeden, namenPerId);

      return {
        teamId: team.id,
        teamNaam: team.naam,
        brutoDoel: d.bruto_bedrag,
        nettoDoel: d.netto_bedrag,
        gefactureerdDitJaar,
        brutoOmzetTeam,
        urenOmzetTeam,
        teamlidRijen,
        chartData,
        medewerkerNamen,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.teamNaam.localeCompare(b.teamNaam));

  // Nog te factureren per klant — geen periodefilter, net als de stat-tegel hierboven.
  const nogTeFacturenPerKlant = new Map<string, { naam: string; bedrag: number }>();
  for (const r of rows) {
    if (!isNogTeFactureren(r.status, r.declarabel)) continue;
    const naam = (r.klanten as unknown as { naam: string } | null)?.naam ?? "Onbekend";
    const bestaand = nogTeFacturenPerKlant.get(r.klant_id) ?? { naam, bedrag: 0 };
    bestaand.bedrag += regelbedrag(r);
    nogTeFacturenPerKlant.set(r.klant_id, bestaand);
  }
  const nogTeFacturenTabel = Array.from(nogTeFacturenPerKlant.values())
    .filter((r) => r.bedrag > 0)
    .sort((a, b) => b.bedrag - a.bedrag);

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

      {teamKaarten.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">Teams</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Omzet-periode:</span>
              <PeriodeSelect />
            </div>
          </div>

          {teamKaarten.map((t) => (
            <Card key={t.teamId} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{t.teamNaam}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Brutotarget {huidigJaar}</span>
                    <span className="tabular-figures text-muted-foreground">
                      {euro(t.gefactureerdDitJaar)} / {euro(t.brutoDoel)}
                    </span>
                  </div>
                  <Progress value={t.brutoDoel > 0 ? (t.gefactureerdDitJaar / t.brutoDoel) * 100 : 0} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nettotarget {huidigJaar}: {t.nettoDoel !== null ? euro(t.nettoDoel) : "nog niet ingesteld"}
                </p>

                <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Bruto-omzet team · {periodeLabel(periode)}
                    </p>
                    <p className="text-xl font-semibold tabular-figures">{euro(t.brutoOmzetTeam)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Uren-omzet team · {periodeLabel(periode)}
                    </p>
                    <p className="text-xl font-semibold tabular-figures">{euro(t.urenOmzetTeam)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teamlid</TableHead>
                        <TableHead className="text-right">Bruto-omzet</TableHead>
                        <TableHead className="text-right">Uren-omzet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.teamlidRijen.map((lid) => (
                        <TableRow key={lid.naam}>
                          <TableCell>{lid.naam}</TableCell>
                          <TableCell className="text-right tabular-figures">{euro(lid.bruto)}</TableCell>
                          <TableCell className="text-right tabular-figures">{euro(lid.uren)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Bruto-omzet per teamlid, per maand ({huidigJaar} — ongefilterd, trendweergave)
                  </p>
                  {t.medewerkerNamen.length > 0 ? (
                    <OmzetGrafiek data={t.chartData} medewerkerNamen={t.medewerkerNamen} />
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nog geen gefactureerde factuuritems in {huidigJaar}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Nog te factureren per klant</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {nogTeFacturenTabel.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Niets nog te factureren.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klant</TableHead>
                  <TableHead className="text-right">Nog te factureren</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nogTeFacturenTabel.map((r) => (
                  <TableRow key={r.naam}>
                    <TableCell>{r.naam}</TableCell>
                    <TableCell className="text-right tabular-figures text-warning">{euro(r.bedrag)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
