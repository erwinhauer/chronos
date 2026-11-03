import { TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag, nettoOmzetPlaceholder } from "@/lib/factuurbedragen";
import { parsePeriodeKey, periodeLabel, inPeriode, STANDAARD_DASHBOARD_PERIODE } from "@/lib/omzet-periode";
import { codeVoorDienstLabel, PRODUCTGROEP_CODES } from "@/lib/dossiernummer";
import { haalLandenMap, type LandenMap } from "@/lib/landen";
import { eersteDienst, groepeerPerProductgroep, groepeerPerLand, groepeerPerProductgroepEnLand } from "@/lib/omzet-aggregatie";
import { dwoKleurToken } from "@/lib/dwo-kleur";
import { cn } from "@/lib/utils";
import { OmzetGrafiek, type OmzetRij } from "@/components/omzet-grafiek";
import { PeriodeKeuze } from "@/components/periode-keuze";
import { TeamledenAccordeon } from "@/components/teamleden-accordeon";
import { JaarSelect } from "@/components/jaar-select";
import type { TeamlidKpi } from "@/components/teamlid-kpi-tegel";
import { TeamlidKaart } from "@/components/teamlid-kaart";
import { KpiTegel } from "@/components/kpi-tegel";
import { DashboardSectie, SectieKop } from "@/components/dashboard-sectie";
import { DashboardWissel } from "@/components/dashboard-wissel";
import { DwoGrafiek, type DwoMaandRij } from "@/components/dwo-grafiek";
import { DashboardHero } from "@/components/dashboard-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedProgress } from "@/components/segmented-progress";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { CountryFlag } from "@/components/ui/country-flag";
import { DienstIcon } from "@/components/ui/dienst-icon";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TopKlantenTabel, type TopKlantRij } from "@/components/top-klanten-tabel";

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAX_SERIES = 5;

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

type FactuurRegel = {
  medewerker_id: string;
  klant_id: string;
  team_id: string | null;
  facturatiebatch_id: string | null;
  definitief_op: string | null;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  qty: number;
  status: "aangemaakt" | "definitief";
  declarabel: boolean;
  datum: string;
  prijstype: string;
  klanten: { naam: string } | null;
  factuuritem_dossiers: { type_dienst: string | null; land: string | null; volgorde: number }[];
};

// Korte uitleg op de DWO-tegels.
const DWO_UITLEG =
  "DWO = Days Work-In-Progress Outstanding, het aantal dagen tussen de dag dat je het werk hebt gedaan en de dag dat je het factureert. Het streven is hier maximaal 45 dagen tussen te hebben zitten en werk dus zo kort mogelijk op te sparen.";

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

// Per teamlid (teamleider eerst, dan alfabetisch): uren gefactureerd (aantal
// + €) en niet-uren gefactureerd (€) — gebruikt voor de MTD- en YTD-rij van
// vierkante KPI-tegels op het teamleider/medewerker-dashboard.
function berekenTeamlidKpiRijen(
  rows: FactuurRegel[],
  leden: Set<string>,
  namenPerId: Map<string, string>,
  teamleiderIds: Set<string>
): TeamlidKpi[] {
  const map = new Map<string, TeamlidKpi>();
  for (const lidId of leden) {
    map.set(lidId, {
      naam: namenPerId.get(lidId) ?? "Onbekend",
      isTeamleider: teamleiderIds.has(lidId),
      urenAantal: 0,
      urenBedrag: 0,
      nietUrenBedrag: 0,
    });
  }
  for (const r of rows) {
    const rij = map.get(r.medewerker_id);
    if (!rij) continue;
    if (r.prijstype === "uren") {
      rij.urenAantal += r.qty;
      rij.urenBedrag += regelbedrag(r);
    } else if (r.prijstype === "vast_honorarium") {
      rij.nietUrenBedrag += regelbedrag(r);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.isTeamleider !== b.isTeamleider) return a.isTeamleider ? -1 : 1;
    return a.naam.localeCompare(b.naam);
  });
}

// Onderhanden werk (nog te factureren) per teamlid, zelfde volgorde als de
// "Per teamlid"-tegels hierboven: teamleider eerst, dan alfabetisch.
function berekenOhwPerTeamlid(
  ohwRows: FactuurRegel[],
  leden: Set<string>,
  namenPerId: Map<string, string>,
  teamleiderIds: Set<string>
): { naam: string; isTeamleider: boolean; bedrag: number }[] {
  const map = new Map<string, { naam: string; isTeamleider: boolean; bedrag: number }>();
  for (const lidId of leden) {
    map.set(lidId, { naam: namenPerId.get(lidId) ?? "Onbekend", isTeamleider: teamleiderIds.has(lidId), bedrag: 0 });
  }
  for (const r of ohwRows) {
    const rij = map.get(r.medewerker_id);
    if (rij) rij.bedrag += regelbedrag(r);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.isTeamleider !== b.isTeamleider) return a.isTeamleider ? -1 : 1;
    return a.naam.localeCompare(b.naam);
  });
}

// Top-klanten mét een per-klant uitsplitsing naar productgroep en land/regio
// (voor de uitklapbare rijen in TopKlantenTabel) — dezelfde functie voedt zowel
// de bedrijfsbrede kaart als elke per-team kaart, elk met hun eigen rijenset.
function berekenTopKlanten(rows: FactuurRegel[], landenMap: LandenMap, top: number): TopKlantRij[] {
  const perKlant = new Map<string, { naam: string; omzet: number; rows: FactuurRegel[] }>();
  for (const r of rows) {
    const naam = r.klanten?.naam ?? "Onbekend";
    const bestaand = perKlant.get(r.klant_id) ?? { naam, omzet: 0, rows: [] };
    bestaand.omzet += regelbedrag(r);
    bestaand.rows.push(r);
    perKlant.set(r.klant_id, bestaand);
  }
  return Array.from(perKlant.entries())
    .map(([klantId, v]) => ({
      klantId,
      naam: v.naam,
      omzet: v.omzet,
      perProductgroep: groepeerPerProductgroep(v.rows).map(({ code, label, omzet }) => ({ code, label, omzet })),
      perLand: groepeerPerLand(v.rows, landenMap, 20),
    }))
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, top);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    periode?: string;
    jaar?: string;
    weergave?: string;
  }>;
}) {
  const { periode: periodeParam, jaar: jaarParam, weergave: weergaveParam } = await searchParams;
  // Het dashboard heeft twee blokken: "Lopend jaar" (vast, het gekozen kalenderjaar) en
  // "Periode" (alles daarin volgt deze ene periodekeuze: tegels, uitsplitsing per teamlid,
  // lijsten per klant/productgroep/land en DWO).
  const periode = parsePeriodeKey(periodeParam, STANDAARD_DASHBOARD_PERIODE);
  const echtHuidigJaar = new Date().getFullYear();
  const gekozenJaar = jaarParam && /^\d{4}$/.test(jaarParam) ? Number(jaarParam) : echtHuidigJaar;

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  // Bureaukosten-KPI is alleen voor directie/beheerder — de query alleen voor
  // hen uitvoeren i.p.v. voor iedereen die de pagina laadt.
  const zietBureaukosten = profile?.role === "directie" || profile?.role === "beheerder";

  const [
    { data: items },
    { data: teamdoelen },
    { data: teamMembers },
    { data: profiles },
    { data: teamsBasis },
    landenMap,
    { data: batches },
  ] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "medewerker_id, klant_id, team_id, facturatiebatch_id, definitief_op, honorarium, externe_kosten, korting, qty, status, declarabel, datum, prijstype, klanten(naam), factuuritem_dossiers(type_dienst, land, volgorde)"
      ),
    supabase.from("teamdoelen").select("bruto_bedrag, netto_bedrag, teams(id, naam)").eq("jaar", gekozenJaar),
    supabase.from("team_members").select("team_id, profile_id"),
    supabase.from("profiles").select("id, full_name, role"),
    supabase.from("teams").select("id, naam").order("naam"),
    haalLandenMap(supabase),
    zietBureaukosten
      ? supabase.from("facturatiebatches").select("id, totaal_kantoorkosten, periode_eind, goedgekeurd_op")
      : Promise.resolve({ data: null }),
  ]);

  const rows = (items ?? []) as unknown as FactuurRegel[];

  const ditJaar = rows.filter((r) => isGefactureerd(r.status) && new Date(r.datum).getFullYear() === gekozenJaar);
  // Periode-gefilterd (voor de omzet-uitsplitsingen en de stat-tegels) — los van
  // "ditJaar", dat altijd het volledige gekozen jaar blijft voor de on-target-berekening.
  const inGekozenPeriode = ditJaar.filter((r) => inPeriode(r.datum, periode, gekozenJaar));
  const inGekozenPeriodeUren = inGekozenPeriode.filter((r) => r.prijstype === "uren");

  const gefactureerd = inGekozenPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);

  // Bureaukosten staan per specificatie vast (niet per factuuritem te
  // herleiden, zie factuurbedragen.ts), dus hier los van "gefactureerd"
  // opgeteld uit facturatiebatches — periode_eind is de beste beschikbare
  // benadering van "in welke periode dit werk viel" op batch-niveau (een
  // batch kan een periodegrens overspannen terwijl de onderliggende items
  // dat niet doen, dus dit sluit niet altijd tot op de euro aan met
  // "gefactureerd" hierboven).
  const bureaukostenTotaal = (batches ?? [])
    .filter((b) => inPeriode(b.periode_eind, periode, gekozenJaar))
    .reduce((sum, b) => sum + b.totaal_kantoorkosten, 0);

  // Bureaukosten over het hele gekozen kalenderjaar (vaste "Lopend jaar"-tegel), los van
  // de periodekeuze hierboven.
  const bureaukostenJaar = (batches ?? [])
    .filter((b) => new Date(b.periode_eind).getFullYear() === gekozenJaar)
    .reduce((sum, b) => sum + b.totaal_kantoorkosten, 0);

  const namenPerId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const teamleiderIds = new Set((profiles ?? []).filter((p) => p.role === "teamleider").map((p) => p.id));

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

  // Onderhanden werk (OHW) — declarabel werk dat al gedaan maar nog niet
  // gefactureerd is, per team. Los van teamdoelen (die pas bestaan als er voor
  // dat jaar een target is ingevuld) — OHW gaat over nú openstaand werk, dus
  // gebaseerd op de volledige teamlijst.
  //
  // Groeperen op het eigen team_id van het item, NIET op teamlidmaatschap van
  // de medewerker — anders telt een item van iemand in meerdere teams dubbel
  // mee (eens bij elk van zijn teams). Zelfde reden waarom team_id destijds
  // aan factuuritems is toegevoegd (zie de kolomcomment op die tabel).
  // Onderhanden werk is ALLE declarabele, nog niet gefactureerde werk, hoe oud ook: een
  // periodekeuze (bv. november) laat dus ook werk uit eerdere periodes zien. Daarom één set,
  // zowel voor het vaste "Lopend jaar"-blok als voor het "Periode"-blok.
  const ohwRows = rows.filter((r) => isNogTeFactureren(r.status, r.declarabel));
  const ohwTotaal = ohwRows.reduce((sum, r) => sum + regelbedrag(r), 0);
  const ohwPerTeam = (teamsBasis ?? []).map((team) => {
    const bedrag = ohwRows.filter((r) => r.team_id === team.id).reduce((sum, r) => sum + regelbedrag(r), 0);
    return { teamId: team.id, teamNaam: team.naam, bedrag };
  });
  // Rijen zonder team_id (oude, niet-teruggevulde items) horen niet bij één
  // specifiek team — apart tonen i.p.v. laten verdwijnen uit de per-team-
  // optelling (alleen relevant voor de zietAlleTeams-weergave; directie/
  // finance/beheerder zien via RLS toch al alles).
  const ohwGeenTeamRowsAlle = ohwRows.filter((r) => r.team_id === null);
  const ohwGeenTeamAlle = ohwGeenTeamRowsAlle.reduce((sum, r) => sum + regelbedrag(r), 0);

  // DWO (Days Work Outstanding) — hoeveel dagen werk gemiddeld als onderhanden werk
  // blijft staan voordat het definitief wordt gemaakt (in een specificatie wordt vastgelegd):
  // per factuuritem het aantal dagen tussen zijn eigen datum en `definitief_op`, het moment
  // waarop het item definitief is geworden (op het item zelf vastgelegd; voor items van vóór
  // die kolom is het teruggezet naar het goedkeurmoment van de specificatie, en als vangnet
  // vallen we daar nog op terug). Dit is een achteraf-gemeten doorlooptijd van al afgeronde
  // items, geen schatting op basis van het huidige factuurtempo. Het is een gewoon gemiddelde
  // per item: elk item telt even zwaar, ongeacht het bedrag. De periodekeuze filtert op
  // wanneer het item definitief is geworden (dus "welke items zijn er in deze periode
  // definitief gemaakt"), niet op de datum van het item zelf.
  const zietDwo = profile?.role === "directie" || profile?.role === "beheerder";
  const goedgekeurdOpPerBatch = new Map((batches ?? []).map((b) => [b.id, b.goedgekeurd_op]));
  type DwoRegel = { teamId: string | null; dagen: number; definitiefOp: string };
  const alleDwoRegels: DwoRegel[] = rows.flatMap((r) => {
    const definitiefOp =
      r.definitief_op ?? (r.facturatiebatch_id ? goedgekeurdOpPerBatch.get(r.facturatiebatch_id) : undefined);
    if (!definitiefOp || !isGefactureerd(r.status)) return [];
    // definitief_op is een timestamptz (heeft een tijdstip), datum is een pure date: op
    // kalenderdatum vergelijken (niet op exacte milliseconden, anders schuift elk resultaat
    // met het tijdstip-op-de-dag mee).
    const dagen = (new Date(definitiefOp.slice(0, 10)).getTime() - new Date(r.datum).getTime()) / (1000 * 60 * 60 * 24);
    return [{ teamId: r.team_id, dagen, definitiefOp }];
  });
  // DWO volgt de gekozen periode van het "Periode"-blok.
  const dwoRegels = alleDwoRegels.filter((r) => inPeriode(r.definitiefOp, periode, gekozenJaar));
  function berekenDwo(regels: DwoRegel[]): number | null {
    if (regels.length === 0) return null;
    return regels.reduce((sum, r) => sum + r.dagen, 0) / regels.length;
  }
  const dwoTotaal = berekenDwo(dwoRegels);
  // DWO per maand van het gekozen jaar (voor de trendgrafiek in "Lopend jaar"), plus het
  // gemiddelde over het hele jaar.
  const dwoJaarRegels = alleDwoRegels.filter((r) => new Date(r.definitiefOp).getFullYear() === gekozenJaar);
  const dwoJaar = berekenDwo(dwoJaarRegels);
  const dwoPerMaand: DwoMaandRij[] = MAANDEN.map((maand, i) => {
    const regels = dwoJaarRegels.filter((r) => new Date(r.definitiefOp).getMonth() === i);
    const dagen = berekenDwo(regels);
    return { maand, dagen: dagen === null ? null : Math.round(dagen * 10) / 10, aantal: regels.length };
  });

  const teamKaarten = (teamdoelen ?? [])
    .map((d) => {
      const team = d.teams as unknown as { id: string; naam: string } | null;
      if (!team) return null;
      if (!zietAlleTeams && !eigenTeamIds.has(team.id)) return null;

      // Groeperen op het eigen team_id van het item, niet op teamlidmaatschap
      // van de medewerker — anders telt het werk van iemand in meerdere teams
      // dubbel mee (eens bij elk van zijn teams). `leden` blijft wel nodig om
      // per teamlid een rij te tonen, ook als die (nog) niets heeft gedaan.
      const leden = ledenPerTeam.get(team.id) ?? new Set();
      const gefactureerdDitJaar = ditJaar
        .filter((r) => r.team_id === team.id)
        .reduce((sum, r) => sum + regelbedrag(r), 0);

      // Alles hieronder volgt de ene gekozen periode (het "Periode"-blok), behalve
      // gefactureerdDitJaar/ohwTeamOnbeperkt/trend: die horen bij het vaste "Lopend jaar".
      const teamItemsInPeriode = inGekozenPeriode.filter((r) => r.team_id === team.id);
      const gefactureerdPeriode = teamItemsInPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);
      const teamlidKpiRijen = berekenTeamlidKpiRijen(teamItemsInPeriode, leden, namenPerId, teamleiderIds);
      const ohwRowsTeamPeriode = ohwRows.filter((r) => r.team_id === team.id);
      const ohwPeriode = ohwRowsTeamPeriode.reduce((sum, r) => sum + regelbedrag(r), 0);
      const ohwPerTeamlidPeriode = berekenOhwPerTeamlid(ohwRowsTeamPeriode, leden, namenPerId, teamleiderIds);
      const nogTeFacturenPerKlantPeriode = berekenNogTeFacturenPerKlant(ohwRowsTeamPeriode);
      const topKlanten = berekenTopKlanten(teamItemsInPeriode, landenMap, 20);
      const perProductgroepPeriode = groepeerPerProductgroep(teamItemsInPeriode);
      const perLandRegioPeriode = groepeerPerLand(teamItemsInPeriode, landenMap, 20);
      const perProductgroepEnLandPeriode = groepeerPerProductgroepEnLand(teamItemsInPeriode, landenMap, 6);
      const dwoTeamPeriode = berekenDwo(dwoRegels.filter((r) => r.teamId === team.id));

      // Vast "Lopend jaar": onbeperkte OHW van dit team en de trend per teamlid per maand.
      const teamlidKpiRijenJaar = berekenTeamlidKpiRijen(
        ditJaar.filter((r) => r.team_id === team.id),
        leden,
        namenPerId,
        teamleiderIds
      );
      const ohwTeamOnbeperkt = ohwPerTeam.find((t) => t.teamId === team.id)?.bedrag ?? 0;
      const { chartData, medewerkerNamen } = buildOmzetGrafiekData(
        ditJaar.filter((r) => r.team_id === team.id),
        namenPerId
      );

      return {
        teamId: team.id,
        teamNaam: team.naam,
        brutoDoel: d.bruto_bedrag,
        nettoDoel: d.netto_bedrag,
        gefactureerdDitJaar,
        ohwTeamOnbeperkt,
        teamlidKpiRijenJaar,
        gefactureerdPeriode,
        ohwPeriode,
        ohwPerTeamlidPeriode,
        nogTeFacturenPerKlantPeriode,
        teamlidKpiRijen,
        topKlanten,
        perProductgroepPeriode,
        perLandRegioPeriode,
        perProductgroepEnLandPeriode,
        dwoTeamPeriode,
        chartData,
        medewerkerNamen,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.teamNaam.localeCompare(b.teamNaam));

  // Omzet die niet op een teamkaart terechtkomt omdat de medewerker (nog) geen
  // lid is van een team — anders verdwijnt die omzet daar stilletjes uit beeld
  // (de teamkaarten filteren strikt op team_members), terwijl de factuuritems
  // zelf wel degelijk op haar/zijn naam staan. Alleen zinvol voor rollen die
  // toch al alle teams zien.
  const alleTeamLeden = new Set<string>();
  for (const set of ledenPerTeam.values()) {
    for (const id of set) alleTeamLeden.add(id);
  }
  const nietInTeamMap = new Map<string, { naam: string; bruto: number; uren: number }>();
  for (const r of inGekozenPeriode) {
    if (alleTeamLeden.has(r.medewerker_id)) continue;
    const naam = namenPerId.get(r.medewerker_id) ?? "Onbekend";
    const bestaand = nietInTeamMap.get(r.medewerker_id) ?? { naam, bruto: 0, uren: 0 };
    bestaand.bruto += regelbedrag(r);
    nietInTeamMap.set(r.medewerker_id, bestaand);
  }
  for (const r of inGekozenPeriodeUren) {
    if (alleTeamLeden.has(r.medewerker_id)) continue;
    const rij = nietInTeamMap.get(r.medewerker_id);
    if (rij) rij.uren += regelbedrag(r);
  }
  const nietInTeamRijen = Array.from(nietInTeamMap.values()).sort((a, b) => b.bruto - a.bruto);

  // Omzet per productgroep — op basis van de dossiernummer-afgeleide dienst van
  // het eerste dossier op het item (bij meerdere dossiers op één regel is dat
  // de conventie die de rest van de app ook al aanhoudt bij weergave). Geordend
  // op de acht productgroepcodes (TM/D/I/O/CA/S/W/@) die de rapportage vast wil.
  const perDienst = new Map<string, { code: string; aantal: number; omzet: number; uren: number }>();
  for (const r of inGekozenPeriode) {
    const dienst = eersteDienst(r);
    const code = dienst === "Onbekend" ? "—" : codeVoorDienstLabel(dienst);
    const bestaand = perDienst.get(dienst) ?? { code, aantal: 0, omzet: 0, uren: 0 };
    bestaand.aantal += 1;
    bestaand.omzet += regelbedrag(r);
    if (r.prijstype === "uren") bestaand.uren += regelbedrag(r);
    perDienst.set(dienst, bestaand);
  }
  const productgroepVolgordeIndex = (code: string) => {
    const i = PRODUCTGROEP_CODES.indexOf(code);
    return i === -1 ? PRODUCTGROEP_CODES.length : i;
  };
  const dienstenTabel = Array.from(perDienst.entries())
    .map(([dienst, v]) => ({ dienst, ...v }))
    .sort((a, b) => productgroepVolgordeIndex(a.code) - productgroepVolgordeIndex(b.code));

  // Omzet per land/regio — zelfde bron en aanpak als "Omzet per productgroep",
  // maar gegroepeerd op de dossiernummer-afgeleide land-ISO van het eerste dossier.
  const landenTabel = groepeerPerLand(inGekozenPeriode, landenMap, 20);

  // Omzet per klant, bedrijfsbreed/team- of persoonsgebonden (via RLS al op de
  // juiste rol-scope beperkt) — met per-klant uitsplitsing voor de uitklaprijen.
  const topKlantenHeleGroep = berekenTopKlanten(inGekozenPeriode, landenMap, 20);

  // Nog te factureren per klant — herbruikbaar, zowel bedrijfsbreed (hieronder,
  // globale periode) als per team op Sectie 2 van het Praktijkvoerder/Gebruiker-
  // dashboard (teamKaarten hieronder, sectie2Periode).
  function berekenNogTeFacturenPerKlant(regels: FactuurRegel[]) {
    const map = new Map<string, { naam: string; bedrag: number }>();
    for (const r of regels) {
      const naam = r.klanten?.naam ?? "Onbekend";
      const bestaand = map.get(r.klant_id) ?? { naam, bedrag: 0 };
      bestaand.bedrag += regelbedrag(r);
      map.set(r.klant_id, bestaand);
    }
    return Array.from(map.values())
      .filter((r) => r.bedrag > 0)
      .sort((a, b) => b.bedrag - a.bedrag);
  }
  const nogTeFacturenTabel = berekenNogTeFacturenPerKlant(ohwRows);

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

  const periodeTekst = periodeLabel(periode);
  // Welk blok bovenaan open staat: expliciet gekozen (?weergave=), anders het periodeblok zodra er
  // een periode in de URL staat (bv. een gedeelde link), anders "Lopend jaar".
  const beginWeergave: "jaar" | "periode" =
    weergaveParam === "periode" || (weergaveParam !== "jaar" && periodeParam) ? "periode" : "jaar";
  const jaarTitel = isLopendJaar ? `${gekozenJaar} tot nu toe` : `Heel ${gekozenJaar}`;
  const jaarHint = isLopendJaar
    ? "1 januari t/m vandaag · staat vast en verandert niet met de periodekeuze"
    : `Kalenderjaar ${gekozenJaar} · staat vast en verandert niet met de periodekeuze`;
  const dwoZichtbaar = zietDwo || !zietAlleTeams;
  // KPI-kaarten per teamlid over het hele jaar, voor het uitklapblok in "Lopend jaar".
  function teamledenJaarKaarten(t: (typeof teamKaarten)[number]) {
    const ohwPerNaam = new Map(t.ohwPerTeamlidPeriode.map((l) => [l.naam, l.bedrag]));
    const totaal: TeamlidKpi = {
      naam: `Totaal ${t.teamNaam}`,
      isTeamleider: false,
      urenAantal: t.teamlidKpiRijenJaar.reduce((sum, l) => sum + l.urenAantal, 0),
      urenBedrag: t.teamlidKpiRijenJaar.reduce((sum, l) => sum + l.urenBedrag, 0),
      nietUrenBedrag: t.teamlidKpiRijenJaar.reduce((sum, l) => sum + l.nietUrenBedrag, 0),
    };
    const teamTotaal = totaal.urenBedrag + totaal.nietUrenBedrag;
    return t.teamlidKpiRijenJaar.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">Dit team heeft nog geen teamleden.</p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeamlidKaart isTotaal lid={totaal} ohw={t.ohwTeamOnbeperkt} teamTotaal={teamTotaal} />
        {t.teamlidKpiRijenJaar.map((lid) => (
          <TeamlidKaart key={lid.naam} lid={lid} ohw={ohwPerNaam.get(lid.naam) ?? 0} teamTotaal={teamTotaal} />
        ))}
      </div>
    );
  }
  const teamledenAccordeonItems = (teams: typeof teamKaarten, eigenTitel?: string) =>
    teams.map((t) => ({
      id: t.teamId,
      naam: eigenTitel ?? t.teamNaam,
      aantalLeden: t.teamlidKpiRijenJaar.length,
      totaalTekst: euro(t.gefactureerdDitJaar),
      children: teamledenJaarKaarten(t),
    }));
  const procentVanTarget = (omzet: number, doel: number) => (doel > 0 ? Math.round((omzet / doel) * 100) : null);

  // Aantal tegels bovenaan het periodeblok (voor de kolombreedte).
  const groepTegels = 2 + (zietBureaukosten ? 1 : 0) + (zietDwo ? 1 : 0);
  const groepKolommen = groepTegels >= 4 ? "xl:grid-cols-4" : groepTegels === 3 ? "xl:grid-cols-3" : "xl:grid-cols-2";

  return (
    <div className="flex flex-col gap-7">
      <DashboardHero voornaam={profile ? firstName(profile.full_name) : ""} />

      {/* Lopend jaar en Periode staan bovenaan achter een wissel: één tegelijk in beeld. */}
      <DashboardWissel
        beginWeergave={beginWeergave}
        jaarTitel={jaarTitel}
        periodeTitel={periodeTekst}
        jaar={
      <DashboardSectie
        soort="jaar"
        titel={jaarTitel}
        hint={jaarHint}
        rechts={zietAlleTeams ? <JaarSelect huidigJaar={gekozenJaar} /> : undefined}
      >
        {zietAlleTeams ? (
          <>
            <div className={cn("grid gap-4", zietBureaukosten ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
              <KpiTegel
                variant="navy"
                label={`Gefactureerd ${gekozenJaar}`}
                bedrag={jaarBrutoOmzet}
                sub={`Netto (placeholder 67%): ${euro(jaarNettoOmzet)}`}
              />
              <KpiTegel
                variant="geel"
                label="Onderhanden werk"
                bedrag={ohwTotaal}
                sub="Nog te factureren · hele groep, alle periodes"
              />
              {zietBureaukosten && (
                <KpiTegel
                  variant="wit"
                  label={`Bureaukosten ${gekozenJaar}`}
                  bedrag={bureaukostenJaar}
                  sub={
                    jaarBrutoOmzet > 0
                      ? `${((bureaukostenJaar / jaarBrutoOmzet) * 100).toFixed(1).replace(".", ",")}% van gefactureerd`
                      : undefined
                  }
                />
              )}
            </div>

            <TargetStrook
              label={`Target ${gekozenJaar} · bruto`}
              doel={targetBrutoJaar}
              gefactureerd={jaarBrutoOmzet}
              ohw={ohwTotaal}
              deltaBedrag={deltaBrutoJaar}
              deltaPct={deltaBrutoJaarPct}
              maandTarget={maandTargetBruto}
              nettoTekst={`Nettotarget ${euro(targetNettoJaar)}${
                ontbrekendeNettoDoelen > 0
                  ? ` — nettotarget van ${ontbrekendeNettoDoelen} van ${alleTeamdoelen.length} team(s) nog niet ingesteld`
                  : ""
              }`}
            />

            {zietDwo && (
              <div className="flex flex-col gap-3">
                <SectieKop
                  label="DWO · dagen"
                  titel={`Doorlooptijd per maand ${gekozenJaar}`}
                  rechts={
                    <p className="text-sm text-muted-foreground">
                      Gemiddeld dit jaar:{" "}
                      <span className="font-medium text-foreground">
                        {dwoJaar === null ? "nog geen data" : `${dwoJaar.toFixed(1).replace(".", ",")} dagen`}
                      </span>{" "}
                      · streef onder 45, uiterlijk 60
                    </p>
                  }
                />
                <div className="rounded-[24px] bg-tint p-5">
                  <DwoGrafiek data={dwoPerMaand} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gemiddeld aantal dagen tussen de datum van een factuuritem en het moment dat het definitief is gemaakt,
                    per maand waarin dat gebeurde. Elk item telt even zwaar.
                  </p>
                </div>
              </div>
            )}

            {teamKaarten.length > 0 && (
              <div className="flex flex-col gap-3">
                <SectieKop label="Per team" titel={`Target ${gekozenJaar}`} />
                <div className="grid gap-3 lg:grid-cols-2">
                  {teamKaarten.map((t) => {
                    const pct = procentVanTarget(t.gefactureerdDitJaar, t.brutoDoel);
                    return (
                      <div key={t.teamId} className="flex flex-col gap-3 rounded-[24px] bg-tint p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-lg">{t.teamNaam}</span>
                          <span className="text-2xl font-normal tabular-figures">{pct !== null ? `${pct}%` : "—"}</span>
                        </div>
                        <SegmentedProgress value={t.brutoDoel > 0 ? (t.gefactureerdDitJaar / t.brutoDoel) * 100 : 0} />
                        <p className="text-sm text-muted-foreground tabular-figures">
                          {euro(t.gefactureerdDitJaar)} van {euro(t.brutoDoel)}
                          {t.nettoDoel !== null ? ` · netto ${euro(t.nettoDoel)}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {teamKaarten.length > 0 && (
              <div className="flex flex-col gap-3">
                <SectieKop label="Uitsplitsing" titel={`Per teamlid · ${gekozenJaar}`} />
                <TeamledenAccordeon items={teamledenAccordeonItems(teamKaarten)} />
              </div>
            )}

            <Card className="rounded-[28px] bg-card">
              <CardHeader>
                <CardTitle>Omzet per maand · {gekozenJaar}</CardTitle>
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
                        <TableCell
                          className={`text-right tabular-figures ${m.brutoVs.verschil >= 0 ? "text-success" : "text-warning"}`}
                        >
                          {euro(m.brutoVs.verschil)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-figures ${m.brutoVs.verschil >= 0 ? "text-success" : "text-warning"}`}
                        >
                          {procentLabel(m.brutoVs.procent)}
                        </TableCell>
                        <TableCell className="text-right tabular-figures">{euro(m.netto)}</TableCell>
                        <TableCell
                          className={`text-right tabular-figures ${m.nettoVs.verschil >= 0 ? "text-success" : "text-warning"}`}
                        >
                          {euro(m.nettoVs.verschil)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-figures ${m.nettoVs.verschil >= 0 ? "text-success" : "text-warning"}`}
                        >
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
          </>
        ) : teamKaarten.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Er is nog geen teamtarget voor {gekozenJaar} ingesteld voor jouw team.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {teamKaarten.map((t) => (
              <div key={t.teamId} className="flex flex-col gap-4">
                {teamKaarten.length > 1 && <SectieKop label="Team" titel={t.teamNaam} />}
                <div className="grid gap-4 lg:grid-cols-2">
                  <KpiTegel variant="navy" label={`Gefactureerd ${gekozenJaar}`} bedrag={t.gefactureerdDitJaar} />
                  <KpiTegel
                    variant="geel"
                    label="Onderhanden werk"
                    bedrag={t.ohwTeamOnbeperkt}
                    sub="Nog te factureren · alle periodes"
                  />
                </div>
                <TargetStrook
                  label={`Target ${gekozenJaar} · bruto`}
                  doel={t.brutoDoel}
                  gefactureerd={t.gefactureerdDitJaar}
                  ohw={t.ohwTeamOnbeperkt}
                  deltaBedrag={t.gefactureerdDitJaar - t.brutoDoel}
                  deltaPct={t.brutoDoel > 0 ? ((t.gefactureerdDitJaar - t.brutoDoel) / t.brutoDoel) * 100 : 0}
                  maandTarget={t.brutoDoel / 12}
                  nettoTekst={t.nettoDoel !== null ? `Nettotarget ${euro(t.nettoDoel)}` : "Nettotarget nog niet ingesteld"}
                />
                <TeamledenAccordeon items={teamledenAccordeonItems([t], `Per teamlid · ${gekozenJaar}`)} />
              </div>
            ))}
          </div>
        )}
      </DashboardSectie>
        }
        periode={
      <DashboardSectie
        soort="periode"
        titel={periodeTekst}
        hint="Alles in dit blok volgt je keuze, ook de uitsplitsing per teamlid."
        rechts={<PeriodeKeuze />}
      >
        {zietAlleTeams && (
          <>
            <div className={cn("grid gap-4 sm:grid-cols-2", groepKolommen)}>
              <KpiTegel variant="wit" label="Gefactureerd" bedrag={gefactureerd} sub={periodeTekst} />
              {zietBureaukosten && (
                <KpiTegel
                  variant="wit"
                  label="Bureaukosten"
                  bedrag={bureaukostenTotaal}
                  sub={
                    gefactureerd > 0
                      ? `${((bureaukostenTotaal / gefactureerd) * 100).toFixed(1).replace(".", ",")}% van gefactureerd`
                      : periodeTekst
                  }
                />
              )}
              <KpiTegel variant="geel" label="Onderhanden werk" bedrag={ohwTotaal} sub="Al het werk dat nog niet is gefactureerd" />
              {zietDwo && (
                <KpiTegel
                  variant={dwoTegelVariant(dwoTotaal)}
                  label="DWO · dagen"
                  dagen={dwoTotaal}
                  sub={
                    <>
                      {DWO_UITLEG}
                      <span className="mt-2 block text-xs">
                        Gemiddeld over {dwoRegels.length} {dwoRegels.length === 1 ? "item" : "items"}
                      </span>
                    </>
                  }
                >
                  <DwoSchaal dagen={dwoTotaal} />
                </KpiTegel>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <SectieKop label="Onderhanden werk" titel="Per team · alle periodes" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {ohwPerTeam.map((t) => (
                  <KpiTegel key={t.teamId} variant="wit" grootte="middel" className="min-h-[150px]" label={t.teamNaam} bedrag={t.bedrag} />
                ))}
                {ohwGeenTeamRowsAlle.length > 0 && (
                  <KpiTegel variant="wit" grootte="middel" className="min-h-[150px]" label="Geen team" bedrag={ohwGeenTeamAlle} />
                )}
              </div>
            </div>
          </>
        )}

        {teamKaarten.length > 0 ? (
          <Tabs defaultValue={teamKaarten[0].teamId} className="gap-6">
            <SectieKop
              label="Uitsplitsing"
              titel={`Per teamlid · ${periodeTekst}`}
              rechts={
                teamKaarten.length > 1 ? (
                  <TabsList className="bg-card">
                    {teamKaarten.map((t) => (
                      <TabsTrigger key={t.teamId} value={t.teamId}>
                        {t.teamNaam}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                ) : (
                  <span className="rounded-full bg-card px-4 py-2 text-sm">{teamKaarten[0].teamNaam}</span>
                )
              }
            />
            {teamKaarten.map((t) => {
              const ohwPerNaam = new Map(t.ohwPerTeamlidPeriode.map((l) => [l.naam, l.bedrag]));
              const totaalLid: TeamlidKpi = {
                naam: `Totaal ${t.teamNaam}`,
                isTeamleider: false,
                urenAantal: t.teamlidKpiRijen.reduce((sum, l) => sum + l.urenAantal, 0),
                urenBedrag: t.teamlidKpiRijen.reduce((sum, l) => sum + l.urenBedrag, 0),
                nietUrenBedrag: t.teamlidKpiRijen.reduce((sum, l) => sum + l.nietUrenBedrag, 0),
              };
              const teamTotaal = totaalLid.urenBedrag + totaalLid.nietUrenBedrag;
              return (
                <TabsContent key={t.teamId} value={t.teamId} className="flex flex-col gap-6">
                  {!zietAlleTeams && (
                    <div className={cn("grid gap-4", dwoZichtbaar ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
                      <KpiTegel variant="wit" label="Gefactureerd" bedrag={t.gefactureerdPeriode} sub={periodeTekst} />
                      <KpiTegel variant="geel" label="Onderhanden werk" bedrag={t.ohwPeriode} sub="Al het werk dat nog niet is gefactureerd" />
                      {dwoZichtbaar && (
                        <KpiTegel
                          variant={dwoTegelVariant(t.dwoTeamPeriode)}
                          label="DWO · dagen"
                          dagen={t.dwoTeamPeriode}
                          sub={DWO_UITLEG}
                        >
                          <DwoSchaal dagen={t.dwoTeamPeriode} />
                        </KpiTegel>
                      )}
                    </div>
                  )}

                  {t.teamlidKpiRijen.length === 0 ? (
                    <p className="rounded-[24px] bg-card py-10 text-center text-sm text-muted-foreground">
                      Dit team heeft nog geen teamleden.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <TeamlidKaart isTotaal lid={totaalLid} ohw={t.ohwPeriode} teamTotaal={teamTotaal} />
                      {t.teamlidKpiRijen.map((lid) => (
                        <TeamlidKaart key={lid.naam} lid={lid} ohw={ohwPerNaam.get(lid.naam) ?? 0} teamTotaal={teamTotaal} />
                      ))}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-[28px] bg-card">
                      <CardHeader>
                        <CardTitle>Nog te factureren per klant</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-1">
                        {t.nogTeFacturenPerKlantPeriode.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Niets nog te factureren.</p>
                        ) : (
                          t.nogTeFacturenPerKlantPeriode.map((r) => (
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
                    <Card className="rounded-[28px] bg-card">
                      <CardHeader>
                        <CardTitle>Omzet per klant (top 20)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TopKlantenTabel rijen={t.topKlanten} />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-[28px] bg-card">
                      <CardHeader>
                        <CardTitle>Omzet per productgroep</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-1">
                        {t.perProductgroepPeriode.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
                        ) : (
                          t.perProductgroepPeriode.map((d) => (
                            <div key={d.label} className="flex items-center gap-3 rounded-md p-2">
                              <DienstIcon dienst={d.label} />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {d.code} · {d.label}
                                </p>
                                <p className="text-xs text-muted-foreground">{d.aantal} factuuritems</p>
                              </div>
                              <span className="text-sm font-medium tabular-figures">{euro(d.omzet)}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] bg-card">
                      <CardHeader>
                        <CardTitle>Omzet per land/regio (top 20)</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-1">
                        {t.perLandRegioPeriode.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
                        ) : (
                          t.perLandRegioPeriode.map((l) => (
                            <div key={l.landNaam} className="flex items-center gap-3 rounded-md p-2">
                              <CountryFlag iso={l.iso} naam={l.landNaam} />
                              <span className="flex-1 text-sm font-medium">{l.landNaam}</span>
                              <span className="text-sm font-medium tabular-figures">{euro(l.omzet)}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-[28px] bg-card">
                    <CardHeader>
                      <CardTitle>Omzet per productgroep × land/regio</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Productgroep</TableHead>
                            {t.perProductgroepEnLandPeriode.kolommen.map((k) => (
                              <TableHead key={k} className="text-right">
                                {k}
                              </TableHead>
                            ))}
                            <TableHead className="text-right">Totaal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {t.perProductgroepEnLandPeriode.rijen.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={t.perProductgroepEnLandPeriode.kolommen.length + 2}
                                className="py-10 text-center text-sm text-muted-foreground"
                              >
                                Nog geen omzet in deze periode.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {t.perProductgroepEnLandPeriode.rijen.map((rij) => (
                                <TableRow key={rij.label}>
                                  <TableCell className="font-medium">
                                    {rij.code} · {rij.label}
                                  </TableCell>
                                  {rij.perKolom.map((bedrag, i) => (
                                    <TableCell key={i} className="text-right tabular-figures">
                                      {bedrag > 0 ? euro(bedrag) : "—"}
                                    </TableCell>
                                  ))}
                                  <TableCell className="text-right font-medium tabular-figures">{euro(rij.totaal)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell className="font-medium">Totaal</TableCell>
                                {t.perProductgroepEnLandPeriode.totaalPerKolom.map((bedrag, i) => (
                                  <TableCell key={i} className="text-right font-medium tabular-figures">
                                    {euro(bedrag)}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right font-semibold tabular-figures">
                                  {euro(t.perProductgroepEnLandPeriode.totaal)}
                                </TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {t.medewerkerNamen.length > 0 && (
                    <Card className="rounded-[28px] bg-card">
                      <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle>Bruto-omzet per teamlid, per maand</CardTitle>
                        <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-background uppercase">
                          Lopend jaar {gekozenJaar} · niet gefilterd
                        </span>
                      </CardHeader>
                      <CardContent>
                        <OmzetGrafiek data={t.chartData} medewerkerNamen={t.medewerkerNamen} />
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          !zietAlleTeams && (
            <p className="py-6 text-center text-sm text-muted-foreground">Geen teamgegevens om te tonen.</p>
          )
        )}

        {zietAlleTeams && nietInTeamRijen.length > 0 && (
          <Card className="rounded-[28px] bg-card">
            <CardHeader>
              <CardTitle>Omzet buiten een team · {periodeTekst}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Deze medewerkers zijn nog geen lid van een team, dus hun omzet staat niet op een teamkaart — voeg ze
                toe bij Instellingen &gt; Teams als dat wel zou moeten.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {nietInTeamRijen.map((lid) => (
                <div key={lid.naam} className="flex items-center gap-3 rounded-md p-2">
                  <AvatarInitials naam={lid.naam} />
                  <span className="flex-1 text-sm font-medium">{lid.naam}</span>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-figures">{euro(lid.bruto)}</p>
                    <p className="text-xs text-muted-foreground tabular-figures">{euro(lid.uren)} uren</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {zietAlleTeams && (
          <div className="flex flex-col gap-4">
            <SectieKop label="Hele groep" titel={`Alle teams · ${periodeTekst}`} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-[28px] bg-card">
                <CardHeader>
                  <CardTitle>Omzet per productgroep</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {dienstenTabel.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
                  ) : (
                    dienstenTabel.map((d) => (
                      <div key={d.dienst} className="flex items-center gap-3 rounded-md p-2">
                        <DienstIcon dienst={d.dienst} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {d.code} · {d.dienst}
                          </p>
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

              <Card className="rounded-[28px] bg-card">
                <CardHeader>
                  <CardTitle>Omzet per land/regio (top 20)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {landenTabel.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>
                  ) : (
                    landenTabel.map((l) => (
                      <div key={l.landNaam} className="flex items-center gap-3 rounded-md p-2">
                        <CountryFlag iso={l.iso} naam={l.landNaam} />
                        <span className="flex-1 text-sm font-medium">{l.landNaam}</span>
                        <span className="text-sm font-medium tabular-figures">{euro(l.omzet)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[28px] bg-card">
                <CardHeader>
                  <CardTitle>Omzet per klant (top 20)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopKlantenTabel rijen={topKlantenHeleGroep} />
                </CardContent>
              </Card>

              <Card className="rounded-[28px] bg-card">
                <CardHeader>
                  <CardTitle>Nog te factureren per klant</CardTitle>
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
        )}
      </DashboardSectie>
        }
      />
    </div>
  );
}

// Voortgang richting het jaartarget: groot percentage, een balk en wat er nog te halen is.
function TargetStrook({
  label,
  doel,
  gefactureerd,
  ohw,
  deltaBedrag,
  deltaPct,
  maandTarget,
  nettoTekst,
}: {
  label: string;
  doel: number;
  gefactureerd: number;
  ohw: number;
  deltaBedrag: number;
  deltaPct: number;
  maandTarget: number;
  nettoTekst: string;
}) {
  const pct = doel > 0 ? (gefactureerd / doel) * 100 : 0;
  const metOhw = doel > 0 ? ((gefactureerd + ohw) / doel) * 100 : 0;
  const voorloop = deltaBedrag >= 0;
  return (
    <div className="flex flex-col gap-5 rounded-[28px] bg-tint p-6 lg:flex-row lg:items-center lg:gap-8 lg:p-7">
      <div className="lg:min-w-[220px]">
        <p className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-4xl font-light tracking-tight tabular-figures">{euro(doel)}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>
            Gefactureerd <b className="font-medium">{doel > 0 ? `${pct.toFixed(1).replace(".", ",")}%` : "—"}</b>
          </span>
          <span className="text-muted-foreground tabular-figures">Nog te halen {euro(Math.max(0, doel - gefactureerd))}</span>
        </div>
        <div className="h-3.5 overflow-hidden rounded-full bg-card">
          <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(100, Math.max(pct, pct > 0 ? 1 : 0))}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground tabular-figures">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
              voorloop ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            )}
          >
            {voorloop ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {euro(deltaBedrag)} ({deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(1)}%) t.o.v. target
          </span>
          <span>
            Met onderhanden werk {euro(gefactureerd + ohw)} ({doel > 0 ? `${metOhw.toFixed(1).replace(".", ",")}%` : "—"})
          </span>
          <span>Per maand {euro(maandTarget)}</span>
          <span>{nettoTekst}</span>
        </div>
      </div>
    </div>
  );
}

// DWO-kleur op de tegel: onder 45 dagen is goed (wit), tot 60 aandacht (geel), daarboven rood.
function dwoTegelVariant(dagen: number | null): "wit" | "geel" | "coral" {
  const token = dwoKleurToken(dagen);
  if (token === "destructive") return "coral";
  if (token === "warning") return "geel";
  return "wit";
}

// Schaal 0–100 dagen met de grenzen 45 en 60 en een markering op de huidige DWO.
function DwoSchaal({ dagen }: { dagen: number | null }) {
  const positie = dagen === null ? null : Math.min(100, Math.max(0, dagen));
  return (
    <div className="relative mt-4">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        <i className="block bg-success/70" style={{ flex: 45 }} />
        <i className="block bg-warning/70" style={{ flex: 15 }} />
        <i className="block bg-destructive/70" style={{ flex: 40 }} />
      </div>
      {positie !== null && (
        <span
          className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
          style={{ left: `${positie}%` }}
        />
      )}
    </div>
  );
}
