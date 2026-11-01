"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ALLE_PERIODES,
  STANDAARD_DASHBOARD_PERIODE,
  periodeKey,
  periodeLabel,
  parsePeriodeKey,
} from "@/lib/omzet-periode";

// De ene periodekeuze voor het hele "Periode"-blok: een paar vaste knoppen voor de gangbare
// periodes en een keuzelijst voor de rest. Staat in de URL (?periode=) zodat de pagina
// server-side meeverandert.
const STANDAARD_PERIODE = STANDAARD_DASHBOARD_PERIODE;

export function PeriodeKeuze() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const huidig = parsePeriodeKey(searchParams.get("periode") ?? undefined, STANDAARD_PERIODE);
  const huidigeKey = periodeKey(huidig);
  const huidigKwartaal = Math.floor(new Date().getMonth() / 3) + 1;

  const knoppen: { key: string; label: string }[] = [
    { key: "mtd", label: "Deze maand" },
    { key: `kwartaal-${huidigKwartaal}`, label: "Dit kwartaal" },
    { key: "rolling3m", label: "Laatste 3 mnd" },
    { key: "ytd", label: "Dit jaar" },
  ];
  const opKnop = knoppen.some((k) => k.key === huidigeKey);

  function kies(key: string) {
    const params = new URLSearchParams(searchParams);
    if (key === periodeKey(STANDAARD_PERIODE)) params.delete("periode");
    else params.set("periode", key);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 rounded-full bg-card p-1" role="group" aria-label="Periode">
        {knoppen.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => kies(k.key)}
            aria-pressed={huidigeKey === k.key}
            className={cn(
              "rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
              huidigeKey === k.key
                ? "bg-coral font-medium text-coral-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <select
        value={opKnop ? "" : huidigeKey}
        onChange={(e) => e.target.value && kies(e.target.value)}
        aria-label="Andere periode"
        className={cn(
          "h-10 rounded-full border bg-card px-4 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          opKnop ? "border-input text-muted-foreground" : "border-coral font-medium"
        )}
      >
        <option value="">Andere periode…</option>
        {ALLE_PERIODES.map((p) => (
          <option key={periodeKey(p)} value={periodeKey(p)}>
            {periodeLabel(p)}
          </option>
        ))}
      </select>
    </div>
  );
}
