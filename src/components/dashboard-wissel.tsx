"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarRange, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardWeergave = "jaar" | "periode";

const WEERGAVEN: DashboardWeergave[] = ["jaar", "periode"];

// Wisselt tussen "Lopend jaar" en "Periode" bovenaan het dashboard in plaats van ze onder
// elkaar te zetten. Beide blokken zijn server-side al gerenderd en worden hier alleen
// getoond of verborgen, dus wisselen is direct (geen nieuwe request). De keuze komt in de
// URL (?weergave=) zodat verversen en delen dezelfde weergave geeft.
export function DashboardWissel({
  beginWeergave,
  jaarTitel,
  periodeTitel,
  jaar,
  periode,
}: {
  beginWeergave: DashboardWeergave;
  // Korte beschrijving per tab, bv. "2026 tot nu toe" en "Deze maand (MTD)".
  jaarTitel: string;
  periodeTitel: string;
  jaar: ReactNode;
  periode: ReactNode;
}) {
  const [actief, setActief] = useState<DashboardWeergave>(beginWeergave);

  function kies(weergave: DashboardWeergave) {
    setActief(weergave);
    // replaceState i.p.v. router.push: geen server-roundtrip, wel een bijgewerkte URL
    // (Next.js houdt useSearchParams hiermee in sync, dus de periode- en jaarkeuze behouden hem).
    const url = new URL(window.location.href);
    if (weergave === "jaar") url.searchParams.delete("weergave");
    else url.searchParams.set("weergave", weergave);
    window.history.replaceState(null, "", url);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const volgende =
      WEERGAVEN[(WEERGAVEN.indexOf(actief) + 1) % WEERGAVEN.length];
    kies(volgende);
    document.getElementById(`dashboard-tab-${volgende}`)?.focus();
  }

  const tabs: {
    id: DashboardWeergave;
    label: string;
    titel: string;
    Icon: typeof Clock;
  }[] = [
    { id: "jaar", label: "Lopend jaar", titel: jaarTitel, Icon: Clock },
    {
      id: "periode",
      label: "Periode",
      titel: periodeTitel,
      Icon: CalendarRange,
    },
  ];

  return (
    <>
      <div
        role="tablist"
        aria-label="Dashboardweergave"
        className="grid grid-cols-2 gap-2 rounded-[28px] bg-card p-2 ring-1 ring-border print:hidden"
      >
        {tabs.map(({ id, label, titel, Icon }) => {
          const isActief = actief === id;
          return (
            <button
              key={id}
              id={`dashboard-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={isActief}
              aria-controls={`dashboard-paneel-${id}`}
              tabIndex={isActief ? 0 : -1}
              onClick={() => kies(id)}
              onKeyDown={onKeyDown}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[22px] px-4 py-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-4 sm:px-6 sm:py-4",
                isActief
                  ? id === "jaar"
                    ? "bg-foreground text-background"
                    : "bg-coral text-coral-foreground"
                  : "text-muted-foreground hover:bg-tint hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex",
                  isActief ? "bg-background/15" : "bg-tint ring-1 ring-border",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-[0.12em] uppercase">
                  {label}
                </span>
                <span className="block text-base leading-tight font-light sm:truncate sm:text-xl">
                  {titel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Beide panelen blijven in de DOM (de periodekeuze en het jaar houden hun staat); de
          niet-actieve is verborgen, behalve bij afdrukken, dan komen ze allebei op papier. */}
      <div
        role="tabpanel"
        id="dashboard-paneel-jaar"
        aria-labelledby="dashboard-tab-jaar"
        className={cn(actief !== "jaar" && "hidden print:block")}
      >
        {jaar}
      </div>
      <div
        role="tabpanel"
        id="dashboard-paneel-periode"
        aria-labelledby="dashboard-tab-periode"
        className={cn(actief !== "periode" && "hidden print:block")}
      >
        {periode}
      </div>
    </>
  );
}
