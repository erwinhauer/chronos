import { Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

export type MeldingSoort = Database["public"]["Enums"]["melding_soort"];

export const MELDING_SOORT_LABELS: Record<MeldingSoort, string> = {
  info: "Ter info (groen)",
  waarschuwing: "Waarschuwing (oranje)",
  urgent: "Urgent (rood)",
};

const STIJL: Record<MeldingSoort, { vlak: string; icoon: string; Icon: typeof Info }> = {
  info: { vlak: "border-success/40 bg-success/10", icoon: "text-success", Icon: Info },
  waarschuwing: { vlak: "border-warning/50 bg-warning/15", icoon: "text-warning", Icon: TriangleAlert },
  urgent: { vlak: "border-destructive/50 bg-destructive/15 font-medium", icoon: "text-destructive", Icon: OctagonAlert },
};

// Eén melding als balk. Wordt zowel bovenin Chronos als als voorbeeld in Instellingen gebruikt.
export function MeldingBlok({
  soort,
  tekst,
  onSluit,
  className,
}: {
  soort: MeldingSoort;
  tekst: string;
  onSluit?: () => void;
  className?: string;
}) {
  const { vlak, icoon, Icon } = STIJL[soort];
  return (
    <div
      role={soort === "urgent" ? "alert" : "status"}
      className={cn("flex items-start gap-3 border-b px-4 py-2.5 text-sm text-foreground lg:px-9", vlak, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icoon)} aria-hidden="true" />
      <p className="min-w-0 flex-1 whitespace-pre-line break-words">{tekst}</p>
      {onSluit && (
        <button
          type="button"
          onClick={onSluit}
          aria-label="Melding sluiten"
          title="Melding sluiten"
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
