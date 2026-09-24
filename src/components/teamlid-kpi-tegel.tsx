import { euro } from "@/lib/factuurbedragen";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TeamlidKpi = {
  naam: string;
  isTeamleider: boolean;
  urenAantal: number;
  urenBedrag: number;
  nietUrenBedrag: number;
};

// Vierkante tegel per teamlid — vervangt de rij in de vorige "Per teamlid"-tabel.
// `isTotaal` geeft de tegel een iets ander uiterlijk (accentrand) zodat de
// teamtotaal-tegel visueel los blijft staan van de individuele teamleden.
export function TeamlidKpiTegel({ lid, isTotaal = false }: { lid: TeamlidKpi; isTotaal?: boolean }) {
  const totaal = lid.urenBedrag + lid.nietUrenBedrag;
  return (
    <Card className={cn("rounded-2xl", isTotaal && "border-primary/40 bg-primary/5")}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{lid.naam}</span>
          {lid.isTeamleider && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Praktijkvoerder
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fixed fee</span>
            <span className="tabular-figures font-medium">{euro(lid.nietUrenBedrag)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Uren</span>
            <span className="tabular-figures font-medium">
              {euro(lid.urenBedrag)}
              <span className="ml-1 text-xs text-muted-foreground">({lid.urenAantal.toFixed(1)} u)</span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
            <span className="font-medium">Totaal</span>
            <span className="tabular-figures text-base font-semibold">{euro(totaal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
