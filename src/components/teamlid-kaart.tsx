import { euro } from "@/lib/factuurbedragen";
import { cn } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import type { TeamlidKpi } from "@/components/teamlid-kpi-tegel";

// Eén kaart per teamlid (en één voor het teamtotaal): het totaal groot, daaronder de
// uitsplitsing naar uren en fixed fee, wat nog gefactureerd moet worden en het aandeel in het team.
export function TeamlidKaart({
  lid,
  ohw,
  teamTotaal,
  isTotaal = false,
}: {
  lid: TeamlidKpi;
  ohw: number;
  teamTotaal: number;
  isTotaal?: boolean;
}) {
  const totaal = lid.urenBedrag + lid.nietUrenBedrag;
  const aandeel = isTotaal ? 100 : teamTotaal > 0 ? Math.round((totaal / teamTotaal) * 100) : 0;
  const regel = "flex items-center justify-between border-t py-2 text-sm";
  return (
    <div
      className={cn(
        "flex flex-col rounded-[28px] p-6",
        isTotaal ? "bg-tile-navy text-white" : "bg-card text-card-foreground ring-1 ring-border"
      )}
    >
      <div className="flex items-center gap-3">
        {isTotaal ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
            Σ
          </span>
        ) : (
          <AvatarInitials naam={lid.naam} />
        )}
        <div className="min-w-0">
          <p className="truncate text-base">{lid.naam}</p>
          {lid.isTeamleider && (
            <p className={cn("text-xs", isTotaal ? "text-white/70" : "text-muted-foreground")}>Praktijkvoerder</p>
          )}
        </div>
      </div>

      <p className="mt-5 text-4xl leading-none font-normal tracking-tight tabular-figures xl:text-[2.6rem]">
        {euro(totaal)}
      </p>

      <div className={cn("mt-4 h-2 overflow-hidden rounded-full", isTotaal ? "bg-white/20" : "bg-muted")}>
        <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(100, aandeel)}%` }} />
      </div>

      <div className={cn("mt-3", isTotaal ? "text-white/85" : "text-muted-foreground")}>
        <div className={cn(regel, isTotaal ? "border-white/15" : "border-border")}>
          <span>Uren</span>
          <span className={cn("tabular-figures font-medium", isTotaal ? "text-white" : "text-foreground")}>
            {euro(lid.urenBedrag)} · {lid.urenAantal.toFixed(1).replace(".", ",")} u
          </span>
        </div>
        <div className={cn(regel, isTotaal ? "border-white/15" : "border-border")}>
          <span>Fixed fee</span>
          <span className={cn("tabular-figures font-medium", isTotaal ? "text-white" : "text-foreground")}>
            {euro(lid.nietUrenBedrag)}
          </span>
        </div>
        <div className={cn(regel, isTotaal ? "border-white/15" : "border-border")}>
          <span>Nog te factureren</span>
          <span className={cn("tabular-figures font-medium", isTotaal ? "text-white" : "text-foreground")}>
            {euro(ohw)}
          </span>
        </div>
        <div className={cn(regel, isTotaal ? "border-white/15" : "border-border")}>
          <span>Aandeel in team</span>
          <span className={cn("tabular-figures font-medium", isTotaal ? "text-white" : "text-foreground")}>
            {aandeel}%
          </span>
        </div>
      </div>
    </div>
  );
}
