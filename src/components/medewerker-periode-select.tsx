"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MEDEWERKER_PERIODES, periodeKey, periodeLabel, parsePeriodeKey } from "@/lib/omzet-periode";

export function MedewerkerPeriodeSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const huidig = parsePeriodeKey(searchParams.get("medewerkerPeriode") ?? undefined, { type: "mtd" });

  function onChange(waarde: string) {
    const params = new URLSearchParams(searchParams);
    if (waarde === "mtd") params.delete("medewerkerPeriode");
    else params.set("medewerkerPeriode", waarde);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <select
      value={periodeKey(huidig)}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {MEDEWERKER_PERIODES.map((p) => (
        <option key={periodeKey(p)} value={periodeKey(p)}>
          {periodeLabel(p)}
        </option>
      ))}
    </select>
  );
}
