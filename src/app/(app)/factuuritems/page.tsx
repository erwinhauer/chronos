import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { GEEN_FACTUURITEM_AANMAKEN_UITLEG, magFactuuritemAanmaken } from "@/lib/factuuritem-rechten";
import { euro, isGepland, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { vandaagAmsterdam } from "@/lib/vandaag";
import { FactuurGroepenTabel, type FactuurGroepSamenvatting } from "@/components/factuur-groepen-tabel";
import { LinkButton } from "@/components/link-button";
import { StatIcon } from "@/components/stat-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type FactuurRegel = {
  klant_id: string;
  medewerker_id: string;
  datum: string;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  status: "aangemaakt" | "definitief";
  declarabel: boolean;
  team_id: string | null;
  klanten: { naam: string; patricia_id: string | null; valuta: string } | null;
};

// Per klant tellen alleen items mee waarvan de datum bereikt is (aantal, bedrag, oudste datum en het
// totaal openstaand). Items met een datum na vandaag zijn "gepland": die staan apart per klant.
function groepeerPerKlant(
  items: FactuurRegel[],
  vandaag: string
): {
  groepen: FactuurGroepSamenvatting[];
  totaalOpenstaand: number;
} {
  const groepenMap = new Map<string, FactuurGroepSamenvatting>();
  for (const item of items) {
    const klant = item.klanten;
    const bestaand = groepenMap.get(item.klant_id) ?? {
      klantId: item.klant_id,
      klantNaam: klant?.naam ?? "Onbekend",
      patriciaId: klant?.patricia_id ?? null,
      valuta: klant?.valuta ?? "EUR",
      aantalItems: 0,
      oudsteDatum: null,
      bedrag: 0,
      gepland: null,
    };
    if (isGepland(item, vandaag)) {
      const gepland = bestaand.gepland ?? { aantal: 0, bedrag: 0, eersteDatum: item.datum };
      gepland.aantal += 1;
      gepland.bedrag += regelbedrag(item);
      if (item.datum < gepland.eersteDatum) gepland.eersteDatum = item.datum;
      bestaand.gepland = gepland;
    } else {
      bestaand.aantalItems += 1;
      bestaand.bedrag += regelbedrag(item);
      if (bestaand.oudsteDatum === null || item.datum < bestaand.oudsteDatum) bestaand.oudsteDatum = item.datum;
    }
    groepenMap.set(item.klant_id, bestaand);
  }
  const groepen = Array.from(groepenMap.values()).sort((a, b) => a.klantNaam.localeCompare(b.klantNaam));
  const totaalOpenstaand = items
    .filter((r) => isNogTeFactureren(r, vandaag))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  return { groepen, totaalOpenstaand };
}

function ScopeInhoud({ groepen, totaalOpenstaand }: { groepen: FactuurGroepSamenvatting[]; totaalOpenstaand: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <StatIcon icon={Receipt} tint="warning" />
            <span className="text-sm text-muted-foreground">Totaal openstaand</span>
          </div>
          <span className="text-xl font-semibold tabular-figures text-warning">{euro(totaalOpenstaand)}</span>
        </CardContent>
      </Card>

      <FactuurGroepenTabel groepen={groepen} />
    </div>
  );
}

export default async function FactuuritemsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: items }, { data: teamLidmaatschappen }] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "id, klant_id, medewerker_id, datum, honorarium, externe_kosten, korting, status, declarabel, team_id, klanten(naam, patricia_id, valuta)"
      )
      .eq("status", "aangemaakt")
      .order("datum", { ascending: false }),
    profile
      ? supabase.from("team_members").select("teams(id, naam)").eq("profile_id", profile.id)
      : Promise.resolve({ data: null }),
  ]);

  const opgehaaldeItems = (items ?? []) as unknown as FactuurRegel[];
  const mijnTeams = (teamLidmaatschappen ?? [])
    .map((tl) => tl.teams as unknown as { id: string; naam: string } | null)
    .filter((t): t is { id: string; naam: string } => t !== null);

  // Finance/beheerder/directie mogen via RLS alle factuuritems van het hele
  // kantoor zien (nodig voor andere schermen), maar dit overzicht is een
  // persoonlijke werklijst — dus altijd scopen tot eigen items en items van
  // de eigen team(s), ongeacht rol. Zonder dit zag zo'n rol hier ook items
  // van een teamgenoot z'n ándere team, waar je zelf geen lid van bent.
  const mijnTeamIds = new Set(mijnTeams.map((t) => t.id));
  const alleItems = opgehaaldeItems.filter(
    (item) =>
      item.medewerker_id === profile?.id || (item.team_id !== null && mijnTeamIds.has(item.team_id))
  );

  const vandaag = vandaagAmsterdam();
  const scopeAlle = groepeerPerKlant(alleItems, vandaag);

  // Alleen bij lidmaatschap van meerdere teams tonen we tabs — bij 0 of 1
  // team is er niets te filteren en blijft de bestaande, simpele weergave
  // ongewijzigd.
  const toonTeamTabs = mijnTeams.length > 1;
  const scopesPerTeam = toonTeamTabs
    ? mijnTeams.map((team) => ({
        team,
        ...groepeerPerKlant(alleItems.filter((item) => item.team_id === team.id), vandaag),
      }))
    : [];
  const zonderTeam = toonTeamTabs ? alleItems.filter((item) => item.team_id === null) : [];
  const scopeZonderTeam = zonderTeam.length > 0 ? groepeerPerKlant(zonderTeam, vandaag) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Factuuritems</h2>
          <p className="text-sm text-muted-foreground">
            Factuuritems gegroepeerd per klant. Klik op een klant voor de volledige lijst.
          </p>
        </div>
        <LinkButton
          href="/factuuritems/nieuw"
          disabled={!magFactuuritemAanmaken(profile?.role)}
          disabledTitle={GEEN_FACTUURITEM_AANMAKEN_UITLEG}
        >
          <Plus className="h-4 w-4" />
          Nieuw factuuritem
        </LinkButton>
      </div>

      {toonTeamTabs ? (
        <Tabs defaultValue="alle">
          <TabsList>
            <TabsTrigger value="alle">Alle teams</TabsTrigger>
            {scopesPerTeam.map(({ team }) => (
              <TabsTrigger key={team.id} value={team.id}>
                {team.naam}
              </TabsTrigger>
            ))}
            {scopeZonderTeam && <TabsTrigger value="geen-team">Geen team</TabsTrigger>}
          </TabsList>
          <TabsContent value="alle">
            <ScopeInhoud groepen={scopeAlle.groepen} totaalOpenstaand={scopeAlle.totaalOpenstaand} />
          </TabsContent>
          {scopesPerTeam.map(({ team, groepen, totaalOpenstaand }) => (
            <TabsContent key={team.id} value={team.id}>
              <ScopeInhoud groepen={groepen} totaalOpenstaand={totaalOpenstaand} />
            </TabsContent>
          ))}
          {scopeZonderTeam && (
            <TabsContent value="geen-team">
              <ScopeInhoud groepen={scopeZonderTeam.groepen} totaalOpenstaand={scopeZonderTeam.totaalOpenstaand} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <ScopeInhoud groepen={scopeAlle.groepen} totaalOpenstaand={scopeAlle.totaalOpenstaand} />
      )}
    </div>
  );
}
