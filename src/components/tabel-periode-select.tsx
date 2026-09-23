"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MEDEWERKER_PERIODES, periodeKey, periodeLabel, parsePeriodeKey, type Periode } from "@/lib/omzet-periode";

// Generieke periodeselector voor een los, onafhankelijk filterbaar dashboard-
// tabelletje (Omzet per klant/productgroep/land) — zelfde patroon als
// MedewerkerPeriodeSelect, maar herbruikbaar met een eigen query-paramnaam
// zodat meerdere tabellen op één pagina onafhankelijk van elkaar filteren.
// `periodes`/`standaard` optioneel overschrijfbaar voor een tegel met een
// eigen periode-set (bv. de DWO-tegel, die geen ytd/mtd kent).
export function TabelPeriodeSelect({
  paramNaam,
  periodes = MEDEWERKER_PERIODES,
  standaard = { type: "ytd" },
}: {
  paramNaam: string;
  periodes?: Periode[];
  standaard?: Periode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const huidig = parsePeriodeKey(searchParams.get(paramNaam) ?? undefined, standaard);
  const standaardKey = periodeKey(standaard);

  function onChange(waarde: string) {
    const params = new URLSearchParams(searchParams);
    if (waarde === standaardKey) params.delete(paramNaam);
    else params.set(paramNaam, waarde);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <select
      value={periodeKey(huidig)}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {periodes.map((p) => (
        <option key={periodeKey(p)} value={periodeKey(p)}>
          {periodeLabel(p)}
        </option>
      ))}
    </select>
  );
}
