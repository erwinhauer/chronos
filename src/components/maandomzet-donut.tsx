"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { euro } from "@/lib/factuurbedragen";

// Donut "maandomzet vs. maandtarget" — laat zien of het team op schema ligt
// voor het maandtarget, gefactureerd (blauw) én onderhanden werk (koraal)
// samen geteld: nog niet gefactureerd werk telt ook mee voor "op schema".
// Segmenten tellen altijd exact op tot het target (gecapt), zodat de ring
// het target zelf voorstelt — behalve wanneer het target al puur met
// gefactureerde omzet is gehaald: dan een volledige ring in de succeskleur.
export function MaandomzetDonut({ omzet, ohw = 0, target }: { omzet: number; ohw?: number; target: number }) {
  const heeftData = target > 0 || omzet > 0 || ohw > 0;
  const behaaldMetOmzet = target > 0 && omzet >= target;
  const opSchemaPct = target > 0 ? ((omzet + ohw) / target) * 100 : 0;

  const gefactureerd = Math.max(omzet, 0);
  const gecapteOhw = Math.max(0, Math.min(ohw, target - gefactureerd));
  const resterend = Math.max(target - gefactureerd - gecapteOhw, 0);

  const data = !heeftData
    ? [{ naam: "Geen data", waarde: 1 }]
    : behaaldMetOmzet
      ? [{ naam: "Behaald", waarde: 1 }]
      : [
          { naam: "Gefactureerd", waarde: gefactureerd },
          { naam: "Onderhanden werk", waarde: gecapteOhw },
          { naam: "Resterend", waarde: resterend },
        ];

  const kleurVoor = (naam: string) => {
    if (!heeftData) return "var(--muted)";
    if (behaaldMetOmzet) return "var(--success)";
    if (naam === "Gefactureerd") return "var(--chart-1)";
    if (naam === "Onderhanden werk") return "var(--coral)";
    return "var(--muted)";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-full w-full min-h-[140px] items-center justify-center">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="waarde"
              nameKey="naam"
              innerRadius={45}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.naam} fill={kleurVoor(d.naam)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-figures">
            {heeftData ? `${(behaaldMetOmzet ? 100 : opSchemaPct).toFixed(0)}%` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">op schema</span>
        </div>
      </div>
      {heeftData && !behaaldMetOmzet && (
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--chart-1)" }} />
            <span className="text-muted-foreground">Gefactureerd</span>
            <span className="font-medium tabular-figures">{euro(omzet)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--coral)" }} />
            <span className="text-muted-foreground">Onderhanden werk</span>
            <span className="font-medium tabular-figures">{euro(ohw)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
