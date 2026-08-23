import { Receipt, Plus, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag, nettoOmzetPlaceholder } from "@/lib/factuurbedragen";
import { parsePeriodeKey, periodeLabel, inPeriode } from "@/lib/omzet-periode";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { haalLandenMap } from "@/lib/landen";
import { OmzetGrafiek, type OmzetRij } from "@/components/omzet-grafiek";
import { PeriodeSelect } from "@/components/periode-select";
import { JaarSelect } from "@/components/jaar-select";
import { MedewerkerPeriodeSelect } from "@/components/medewerker-periode-select";
import { HeroTile } from "@/components/hero-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedProgress } from "@/components/segmented-progress";
import { StatIcon } from "@/components/stat-icon";
import { LinkButton } from "@/components/link-button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAX_SERIES = 5;

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

type FactuurRegel = {
  medewerker_id: string;
  klant_id: string;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  status: "aangemaakt" | "definitief";
  declarabel: boolean;
  datum: string;
  prijstype: string;
  klanten: { naam: string } | null;
  factuuritem_dossiers: { type_dienst: string | null; land: string | null; volgorde: number }[];
};

function eersteDossier(r: FactuurRegel) {
  const dossiers = r.factuuritem_dossiers ?? [];
  if (dossiers.length === 0) return null;
  return dossiers.slice().sort((a, b) => a.volgorde - b.volgorde)[0];
}

function eersteDienst(r: FactuurRegel): string {
  return eersteDossier(r)?.type_dienst ?? "Onbekend";
}

function eersteLandIso(r: FactuurRegel): string | null {
  return eersteDossier(r)?.land ?? null;
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
  searchParams: Promise<{ periode?: string; jaar?: string; medewerkerPeriode?: string }>;
}) {
  const { periode: periodeParam, jaar: jaarParam, medewerkerPeriode: medewerkerPeriodeParam } = await searchParams;
  const periode = parsePeriodeKey(periodeParam);
  const medewerkerPeriode = parsePeriodeKey(medewerkerPeriodeParam, { type: "mtd" });
  const echtHuidigJaar = new Date().getFullYear();
  const gekozenJaar = jaarParam && /^\d{4}$/.test(jaarParam) ? Number(jaarParam) : echtHuidigJaar;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: items }, { data: teamdoelen }, { data: teamMembers }, { data: profiles }, landenMap] =
    await Promise.all([
      supabase
        .from("factuuritems")
        .select(
          "medewerker_id, klant_id, honorarium, externe_kosten, korting, status, declarabel, datum, prijstype, klanten(naam), factuuritem_dossiers(type_dienst, land, volgorde)"
        ),
      supabase.from("teamdoelen").select("bruto_bedrag, netto_bedrag, teams(id, naam)").eq("jaar", gekozenJaar),
      supabase.from("team_members").select("team_id, profile_id"),
      supabase.from("profiles").select("id, full_name"),
      haalLandenMap(supabase),
    ]);

  const rows = (items ?? []) as unknown as FactuurRegel[];

  const ditJaar = rows.filter((r) => isGefactureerd(r.status) && new Date(r.datum).getFullYear() === gekozenJaar);
  // Periode-gefilterd (voor de omzet-uitsplitsingen en de stat-tegels) — los van
  // "ditJaar", dat altijd het volledige gekozen jaar blijft voor de on-target-berekening.
  const inGekozenPeriode = ditJaar.filter((r) => inPeriode(r.datum, periode, gekozenJaar));
  const inGekozenPeriodeUren = inGekozenPeriode.filter((r) => r.prijstype === "uren");

  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel) && inPeriode(r.datum, periode, gekozenJaar))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = inGekozenPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);

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

      const perKlant = new Map<string, { naam: string; omzet: number }>();
      for (const r of teamItemsInPeriode) {
        const naam = r.klanten?.naam ?? "Onbekend";
        const bestaand = perKlant.get(r.klant_id) ?? { naam, omzet: 0 };
        bestaand.omzet += regelbedrag(r);
        perKlant.set(r.klant_id, bestaand);
      }
      const top3Klanten = Array.from(perKlant.values())
        .sort((a, b) => b.omzet - a.omzet)
        .slice(0, 3);

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
        top3Klanten,
        chartData,
        medewerkerNamen,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.teamNaam.localeCompare(b.teamNaam));

  // Omzet per medewerker, over alle teams heen — alleen zinvol voor rollen die
  // meer dan hun eigen team zien; anders is dit hetzelfde als de teamkaart. Deze
  // tabel heeft een eigen periode-filter (standaard MTD), los van de periode-select
  // hierboven die de rest van de pagina stuurt.
  const inMedewerkerPeriode = ditJaar.filter((r) => inPeriode(r.datum, medewerkerPeriode, gekozenJaar));
  const inMedewerkerPeriodeUren = inMedewerkerPeriode.filter((r) => r.prijstype === "uren");
  const omzetPerMedewerkerMap = new Map<string, { naam: string; bruto: number; uren: number }>();
  for (const r of inMedewerkerPeriode) {
    const naam = namenPerId.get(r.medewerker_id) ?? "Onbekend";
    const bestaand = omzetPerMedewerkerMap.get(r.medewerker_id) ?? { naam, bruto: 0, uren: 0 };
    bestaand.bruto += regelbedrag(r);
    omzetPerMedewerkerMap.set(r.medewerker_id, bestaand);
  }
  for (const r of inMedewerkerPeriodeUren) {
    const rij = omzetPerMedewerkerMap.get(r.medewerker_id);
    if (rij) rij.uren += regelbedrag(r);
  }
  const omzetPerMedewerker = Array.from(omzetPerMedewerkerMap.values()).sort((a, b) => b.bruto - a.bruto);

  // Verkochte diensten — op basis van de dossiernummer-afgeleide dienst van het
  // eerste dossier op het item (bij meerdere dossiers op één regel is dat de
  // conventie die de rest van de app ook al aanhoudt bij weergave).
  const perDienst = new Map<string, { aantal: number; omzet: number; uren: number }>();
  for (const r of inGekozenPeriode) {
    const dienst = eersteDienst(r);
    const bestaand = perDienst.get(dienst) ?? { aantal: 0, omzet: 0, uren: 0 };
    bestaand.aantal += 1;
    bestaand.omzet += regelbedrag(r);
    if (r.prijstype === "uren") bestaand.uren += regelbedrag(r);
    perDienst.set(dienst, bestaand);
  }
  const dienstenTabel = Array.from(perDienst.entries())
    .map(([dienst, v]) => ({ dienst, ...v }))
    .sort((a, b) => b.omzet - a.omzet);

  // Diensten per land/regio — zelfde bron en aanpak als "Verkochte diensten",
  // maar gegroepeerd op de dossiernummer-afgeleide land-ISO van het eerste dossier.
  const perLand = new Map<string, { landNaam: string; omzet: number }>();
  for (const r of inGekozenPeriode) {
    const iso = eersteLandIso(r);
    const landNaam = landNaamVoorIso(iso, landenMap);
    const bestaand = perLand.get(landNaam) ?? { landNaam, omzet: 0 };
    bestaand.omzet += regelbedrag(r);
    perLand.set(landNaam, bestaand);
  }
  const landenTabel = Array.from(perLand.values())
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, 5);

  // Nog te factureren per klant — dezelfde periode/jaar-filter als de rest van het dashboard.
  const nogTeFacturenPerKlant = new Map<string, { naam: string; bedrag: number }>();
  for (const r of rows) {
    if (!isNogTeFactureren(r.status, r.declarabel) || !inPeriode(r.datum, periode, gekozenJaar)) continue;
    const naam = r.klanten?.naam ?? "Onbekend";
    const bestaand = nogTeFacturenPerKlant.get(r.klant_id) ?? { naam, bedrag: 0 };
    bestaand.bedrag += regelbedrag(r);
    nogTeFacturenPerKlant.set(r.klant_id, bestaand);
  }
  const nogTeFacturenTabel = Array.from(nogTeFacturenPerKlant.values())
    .filter((r) => r.bedrag > 0)
    .sort((a, b) => b.bedrag - a.bedrag);

  // Omzet vs. target, bedrijfsbreed — alleen zinvol voor rollen die alle teams zien.
  // "ditJaar" is hier precies de juiste bron: bedrijfsbreed, gefactureerd, en al op het
  // volledige kalenderjaar gefilterd (los van de periode-select hierboven).
  const jaarBrutoOmzet = ditJaar.reduce((sum, r) => sum + regelbedrag(r), 0);
  const jaarNettoOmzet = nettoOmzetPlaceholder(jaarBrutoOmzet);

  const alleTeamdoelen = teamdoelen ?? [];
  const targetBrutoJaar = alleTeamdoelen.reduce((sum, d) => sum + d.bruto_bedrag, 0);
  const teamsMetNettoDoel = alleTeamdoelen.filter((d) => d.netto_bedrag !== null);
  const targetNettoJaar = teamsMetNettoDoel.reduce((sum, d) => sum + (d.netto_bedrag ?? 0), 0);
  const ontbrekendeNettoDoelen = alleTeamdoelen.length - teamsMetNettoDoel.length;
  const maandTargetBruto = targetBrutoJaar / 12;
  const maandTargetNetto = targetNettoJaar / 12;

  const deltaBrutoJaar = jaarBrutoOmzet - targetBrutoJaar;
  const deltaBrutoJaarPct = targetBrutoJaar > 0 ? (deltaBrutoJaar / targetBrutoJaar) * 100 : 0;

  function verschilEnProcent(omzet: number, target: number) {
    const verschil = omzet - target;
    const procent = target > 0 ? (verschil / target) * 100 : 0;
    return { verschil, procent };
  }

  function procentLabel(p: number) {
    return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
  }

  const omzetPerMaandTabel = Array.from({ length: 12 }, (_, maand) => {
    const brutoMaand = ditJaar
      .filter((r) => new Date(r.datum).getMonth() === maand)
      .reduce((sum, r) => sum + regelbedrag(r), 0);
    const nettoMaand = nettoOmzetPlaceholder(brutoMaand);
    return {
      label: periodeLabel({ type: "maand", maand }),
      bruto: brutoMaand,
      netto: nettoMaand,
      ...{ brutoVs: verschilEnProcent(brutoMaand, maandTargetBruto) },
      ...{ nettoVs: verschilEnProcent(nettoMaand, maandTargetNetto) },
    };
  });

  const omzetTotaalRij = {
    bruto: jaarBrutoOmzet,
    netto: jaarNettoOmzet,
    brutoVs: verschilEnProcent(jaarBrutoOmzet, targetBrutoJaar),
    nettoVs: verschilEnProcent(jaarNettoOmzet, targetNettoJaar),
  };

  const isLopendJaar = gekozenJaar === echtHuidigJaar;
  const maandenVerstreken = new Date().getMonth() + 1;
  const extrapolatieBruto = isLopendJaar ? (jaarBrutoOmzet / maandenVerstreken) * 12 : 0;
  const extrapolatieNetto = nettoOmzetPlaceholder(extrapolatieBruto);
  const omzetExtrapolatieRij = {
    bruto: extrapolatieBruto,
    netto: extrapolatieNetto,
    brutoVs: verschilEnProcent(extrapolatieBruto, targetBrutoJaar),
    nettoVs: verschilEnProcent(extrapolatieNetto, targetNettoJaar),
  };

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

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Periode:</span>
        <PeriodeSelect />
        <JaarSelect huidigJaar={gekozenJaar} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <HeroTile label={`Gefactureerd · ${periodeLabel(periode)}`} value={euro(gefactureerd)} icon={ArrowUpRight} />
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={Receipt} tint="warning" className="h-11 w-11" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Nog te factureren · {periodeLabel(periode)}
              </p>
              <div className="text-2xl font-semibold tabular-figures text-warning">{euro(nogTeFactureren)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {zietAlleTeams && (
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-semibold tracking-tight">Omzet vs. target · {gekozenJaar}</h3>

          <div className="grid gap-6 lg:grid-cols-2">
            <HeroTile
              label={`Gerealiseerde omzet · ${gekozenJaar}`}
              value={euro(jaarBrutoOmzet)}
              sub={`Netto (placeholder 67%): ${euro(jaarNettoOmzet)}`}
            >
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  deltaBrutoJaar >= 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                }`}
              >
                {deltaBrutoJaar >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {euro(deltaBrutoJaar)} ({procentLabel(deltaBrutoJaarPct)}) t.o.v. target
              </div>
            </HeroTile>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Target · {gekozenJaar}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Brutotarget</span>
                  <span className="tabular-figures text-muted-foreground">{euro(targetBrutoJaar)}</span>
                </div>
                <SegmentedProgress value={targetBrutoJaar > 0 ? (jaarBrutoOmzet / targetBrutoJaar) * 100 : 0} />
                <p className="text-xs text-muted-foreground">Per maand: {euro(maandTargetBruto)}</p>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Nettotarget</span>
                    <span className="tabular-figures text-muted-foreground">{euro(targetNettoJaar)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Per maand: {euro(maandTargetNetto)}
                    {ontbrekendeNettoDoelen > 0 &&
                      ` — nettotarget van ${ontbrekendeNettoDoelen} van ${alleTeamdoelen.length} team(s) nog niet ingesteld`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Omzet per maand · {gekozenJaar}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maand</TableHead>
                    <TableHead className="text-right">Bruto-omzet</TableHead>
                    <TableHead className="text-right">Verschil</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Netto-omzet</TableHead>
                    <TableHead className="text-right">Verschil</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {omzetPerMaandTabel.map((m) => (
                    <TableRow key={m.label}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-right tabular-figures">{euro(m.bruto)}</TableCell>
                      <TableCell className="text-right tabular-figures text-muted-foreground">
                        {euro(m.brutoVs.verschil)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures text-muted-foreground">
                        {procentLabel(m.brutoVs.procent)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures">{euro(m.netto)}</TableCell>
                      <TableCell className="text-right tabular-figures text-muted-foreground">
                        {euro(m.nettoVs.verschil)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures text-muted-foreground">
                        {procentLabel(m.nettoVs.procent)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Totaal</TableCell>
                    <TableCell className="text-right tabular-figures">{euro(omzetTotaalRij.bruto)}</TableCell>
                    <TableCell className="text-right tabular-figures">{euro(omzetTotaalRij.brutoVs.verschil)}</TableCell>
                    <TableCell className="text-right tabular-figures">
                      {procentLabel(omzetTotaalRij.brutoVs.procent)}
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(omzetTotaalRij.netto)}</TableCell>
                    <TableCell className="text-right tabular-figures">{euro(omzetTotaalRij.nettoVs.verschil)}</TableCell>
                    <TableCell className="text-right tabular-figures">
                      {procentLabel(omzetTotaalRij.nettoVs.procent)}
                    </TableCell>
                  </TableRow>
                  {isLopendJaar && (
                    <TableRow className="italic text-success">
                      <TableCell>Extrapolatie (heel jaar)</TableCell>
                      <TableCell className="text-right tabular-figures">{euro(omzetExtrapolatieRij.bruto)}</TableCell>
                      <TableCell className="text-right tabular-figures">
                        {euro(omzetExtrapolatieRij.brutoVs.verschil)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures">
                        {procentLabel(omzetExtrapolatieRij.brutoVs.procent)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures">{euro(omzetExtrapolatieRij.netto)}</TableCell>
                      <TableCell className="text-right tabular-figures">
                        {euro(omzetExtrapolatieRij.nettoVs.verschil)}
                      </TableCell>
                      <TableCell className="text-right tabular-figures">
                        {procentLabel(omzetExtrapolatieRij.nettoVs.procent)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {zietAlleTeams && (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Omzet per medewerker · alle teams · {periodeLabel(medewerkerPeriode)}</CardTitle>
            <MedewerkerPeriodeSelect />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-right">Bruto-omzet</TableHead>
                  <TableHead className="text-right">Uren-omzet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {omzetPerMedewerker.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Nog geen omzet in deze periode.
                    </TableCell>
                  </TableRow>
                ) : (
                  omzetPerMedewerker.map((m) => (
                    <TableRow key={m.naam}>
                      <TableCell>{m.naam}</TableCell>
                      <TableCell className="text-right tabular-figures">{euro(m.bruto)}</TableCell>
                      <TableCell className="text-right tabular-figures">{euro(m.uren)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {teamKaarten.length > 0 && (
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-semibold tracking-tight">Teams</h3>

          <div className="grid gap-6 lg:grid-cols-2">
          {teamKaarten.map((t) => (
            <Card key={t.teamId} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{t.teamNaam}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Brutotarget {gekozenJaar}</span>
                    <span className="tabular-figures text-muted-foreground">
                      {euro(t.gefactureerdDitJaar)} / {euro(t.brutoDoel)}
                    </span>
                  </div>
                  <SegmentedProgress value={t.brutoDoel > 0 ? (t.gefactureerdDitJaar / t.brutoDoel) * 100 : 0} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nettotarget {gekozenJaar}: {t.nettoDoel !== null ? euro(t.nettoDoel) : "nog niet ingesteld"}
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

                <div className="flex flex-col gap-1 rounded-lg border border-border p-2">
                  {t.teamlidRijen.map((lid) => (
                    <div key={lid.naam} className="flex items-center gap-3 rounded-md p-2">
                      <AvatarInitials naam={lid.naam} />
                      <span className="flex-1 text-sm font-medium">{lid.naam}</span>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-figures">{euro(lid.bruto)}</p>
                        <p className="text-xs text-muted-foreground tabular-figures">{euro(lid.uren)} uren</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm text-muted-foreground">Top 3 klanten · {periodeLabel(periode)}</p>
                  {t.top3Klanten.length > 0 ? (
                    <div className="flex flex-col gap-1 rounded-lg border border-border p-2">
                      {t.top3Klanten.map((k) => (
                        <div key={k.naam} className="flex items-center gap-3 rounded-md p-2">
                          <AvatarInitials naam={k.naam} />
                          <span className="flex-1 text-sm font-medium">{k.naam}</span>
                          <span className="text-sm font-medium tabular-figures">{euro(k.omzet)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Geen omzet in deze periode.</p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Bruto-omzet per teamlid, per maand ({gekozenJaar} — ongefilterd, trendweergave)
                  </p>
                  {t.medewerkerNamen.length > 0 ? (
                    <OmzetGrafiek data={t.chartData} medewerkerNamen={t.medewerkerNamen} />
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nog geen gefactureerde factuuritems in {gekozenJaar}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Verkochte diensten · {periodeLabel(periode)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {dienstenTabel.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
          ) : (
            dienstenTabel.map((d) => (
              <div key={d.dienst} className="flex items-center gap-3 rounded-md p-2">
                <AvatarInitials naam={d.dienst} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.dienst}</p>
                  <p className="text-xs text-muted-foreground">{d.aantal} factuuritems</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-figures">{euro(d.omzet)}</p>
                  <p className="text-xs text-muted-foreground tabular-figures">{euro(d.uren)} uren</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Diensten per land/regio · {periodeLabel(periode)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {landenTabel.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
          ) : (
            landenTabel.map((l) => (
              <div key={l.landNaam} className="flex items-center gap-3 rounded-md p-2">
                <AvatarInitials naam={l.landNaam} />
                <span className="flex-1 text-sm font-medium">{l.landNaam}</span>
                <span className="text-sm font-medium tabular-figures">{euro(l.omzet)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Nog te factureren per klant · {periodeLabel(periode)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {nogTeFacturenTabel.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Niets nog te factureren.</p>
          ) : (
            nogTeFacturenTabel.map((r) => (
              <div key={r.naam} className="flex items-center gap-3 rounded-md p-2">
                <AvatarInitials naam={r.naam} />
                <span className="flex-1 text-sm font-medium">{r.naam}</span>
                <span className="text-sm font-medium tabular-figures text-warning">{euro(r.bedrag)}</span>
                <Badge variant="warning">Openstaand</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
