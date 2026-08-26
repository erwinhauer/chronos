import { euro } from "@/lib/factuurbedragen";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type TeamlidKpi = {
  naam: string;
  isTeamleider: boolean;
  urenAantal: number;
  urenBedrag: number;
  nietUrenBedrag: number;
};

// Vierkante KPI-tegel per teamlid: uren gefactureerd (aantal + €) en
// niet-uren gefactureerd (€) — gebruikt voor de MTD- en YTD-rij op het
// teamleider/medewerker-dashboard.
export function TeamlidKpiTegel({ lid }: { lid: TeamlidKpi }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
        <AvatarInitials naam={lid.naam} />
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{lid.naam}</span>
          {lid.isTeamleider && (
            <Badge variant="outline" className="text-[10px]">
              Teamleider
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold tabular-figures">
            {lid.urenAantal.toFixed(1)} u · {euro(lid.urenBedrag)}
          </p>
          <p className="text-xs text-muted-foreground tabular-figures">{euro(lid.nietUrenBedrag)} niet-uren</p>
        </div>
      </CardContent>
    </Card>
  );
}
