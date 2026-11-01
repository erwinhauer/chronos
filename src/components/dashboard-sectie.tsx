import type { ReactNode } from "react";
import { CalendarRange, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Twee duidelijk verschillende blokken op het dashboard: "Lopend jaar" (vast, volgt de
// periodekeuze niet; navy rand) en "Periode" (volgt de periodekeuze; gestreepte koraalrand
// op een lichte ondergrond). Het label, de rand en de achtergrond maken in één oogopslag
// duidelijk waar je naar kijkt.
export function DashboardSectie({
  soort,
  titel,
  hint,
  rechts,
  children,
  className,
}: {
  soort: "jaar" | "periode";
  titel: string;
  hint: string;
  rechts?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const isJaar = soort === "jaar";
  const Icon = isJaar ? Clock : CalendarRange;
  return (
    <section
      className={cn(
        "flex flex-col gap-6 rounded-[34px] p-6 lg:p-8",
        isJaar ? "border-2 border-foreground bg-card" : "border-2 border-dashed border-coral bg-tint",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase",
              isJaar ? "bg-foreground text-background" : "bg-coral text-coral-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {isJaar ? "Lopend jaar" : "Periode"}
          </span>
          <h2 className="mt-3 text-4xl leading-none font-extralight tracking-tight lg:text-5xl">{titel}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
        </div>
        {rechts && <div className="flex flex-wrap items-center gap-3">{rechts}</div>}
      </div>
      {children}
    </section>
  );
}

// Kleine kop binnen een sectie (bv. "Per teamlid"), met optioneel een label rechts (tabs, tag).
export function SectieKop({ label, titel, rechts }: { label: string; titel: string; rechts?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">{label}</p>
        <h3 className="mt-1 text-3xl font-light tracking-tight">{titel}</h3>
      </div>
      {rechts}
    </div>
  );
}
