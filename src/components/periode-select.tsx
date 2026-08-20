"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ALLE_PERIODES, periodeKey, periodeLabel, parsePeriodeKey } from "@/lib/omzet-periode";

export function PeriodeSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const huidig = parsePeriodeKey(searchParams.get("periode") ?? undefined);

  function onChange(waarde: string) {
    const params = new URLSearchParams(searchParams);
    if (waarde === "ytd") params.delete("periode");
    else params.set("periode", waarde);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <select
      value={periodeKey(huidig)}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {ALLE_PERIODES.map((p) => (
        <option key={periodeKey(p)} value={periodeKey(p)}>
          {periodeLabel(p)}
        </option>
      ))}
    </select>
  );
}
