import { Users, Receipt, PiggyBank, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { OmzetGrafiek, type OmzetRij } from "@/components/omzet-grafiek";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const [{ count: klantenCount }, { data: items }] = await Promise.all([
    supabase.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabase
      .from("factuuritems")
      .select(
        "medewerker_id, honorarium, externe_kosten, korting, status, declarabel, datum, profiles!factuuritems_medewerker_id_fkey(full_name)"
      ),
  ]);

  const rows = items ?? [];
  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = rows.filter((r) => isGefactureerd(r.status)).reduce((sum, r) => sum + regelbedrag(r), 0);

  const ditJaar = rows.filter((r) => isGefactureerd(r.status) && new Date(r.datum).getFullYear() === huidigJaar);
  const totaalDitJaar = ditJaar.reduce((sum, r) => sum + regelbedrag(r), 0);

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
            <div className="text-2xl font-semibold tabular-figures text-warning">{euro(nogTeFactureren)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gefactureerd</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures text-success">{euro(gefactureerd)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Omzet per teamlid</CardTitle>
            <p className="text-sm text-muted-foreground">Gefactureerd per maand, {huidigJaar}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Totaal {huidigJaar}</p>
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
