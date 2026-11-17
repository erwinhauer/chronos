import { Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

export type MeldingSoort = Database["public"]["Enums"]["melding_soort"];

export const MELDING_SOORT_LABELS: Record<MeldingSoort, string> = {
  info: "Ter info (groen)",
  waarschuwing: "Waarschuwing (oranje)",
  urgent: "Urgent (rood)",
};

// Vaste kleuren, los van het thema: rood en oranje met witte tekst, groen met zwarte tekst.
// De tinten zijn zo gekozen dat de tekst in zowel de lichte als de donkere weergave leesbaar blijft.
const STIJL: Record<MeldingSoort, { vlak: string; sluit: string; Icon: typeof Info }> = {
  info: {
    vlak: "bg-[oklch(0.8_0.16_150)] text-black",
    sluit: "hover:bg-black/10",
    Icon: Info,
  },
  waarschuwing: {
    vlak: "bg-[oklch(0.57_0.17_48)] text-white",
    sluit: "hover:bg-white/20",
    Icon: TriangleAlert,
  },
  urgent: {
    vlak: "bg-[oklch(0.55_0.22_27)] text-white",
    sluit: "hover:bg-white/20",
    Icon: OctagonAlert,
  },
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
  const { vlak, sluit, Icon } = STIJL[soort];
  return (
    <div
      role={soort === "urgent" ? "alert" : "status"}
      className={cn("relative flex items-start justify-center gap-3 px-12 py-2.5 text-sm font-bold", vlak, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 text-center whitespace-pre-line break-words">{tekst}</p>
      {onSluit && (
        <button
          type="button"
          onClick={onSluit}
          aria-label="Melding sluiten"
          title="Melding sluiten"
          className={cn(
            "absolute right-3 top-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors lg:right-6",
            sluit
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
