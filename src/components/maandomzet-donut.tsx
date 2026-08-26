"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { euro } from "@/lib/factuurbedragen";

// Donut "maandomzet vs. maandtarget" — twee segmenten (gerealiseerd/resterend)
// tot het target gehaald is, daarna een volledige ring in de succeskleur.
export function MaandomzetDonut({ omzet, target }: { omzet: number; target: number }) {
  const heeftData = target > 0 || omzet > 0;
  const behaald = target > 0 && omzet >= target;
  const pct = target > 0 ? (omzet / target) * 100 : 0;

  const data = !heeftData
    ? [{ naam: "Geen data", waarde: 1 }]
    : behaald
      ? [{ naam: "Behaald", waarde: 1 }]
      : [
          { naam: "Gerealiseerd", waarde: Math.max(omzet, 0) },
          { naam: "Resterend", waarde: Math.max(target - omzet, 0) },
        ];

  const kleurVoor = (i: number) => {
    if (!heeftData) return "var(--muted)";
    if (behaald) return "var(--success)";
    return i === 0 ? "var(--chart-1)" : "var(--muted)";
  };

  return (
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
            {data.map((d, i) => (
              <Cell key={d.naam} fill={kleurVoor(i)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-figures">{heeftData ? `${pct.toFixed(0)}%` : "—"}</span>
        <span className="text-xs text-muted-foreground">{euro(omzet)}</span>
      </div>
    </div>
  );
}
