"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { euro } from "@/lib/factuurbedragen";

// Categorische reeks, dataviz-skill-gevalideerd (adjacent CVD/contrast) — zie globals.css --chart-1..5.
const CHART_KLEUREN = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export type OmzetRij = Record<string, string | number> & { maand: string };

export function OmzetGrafiek({ data, medewerkerNamen }: { data: OmzetRij[]; medewerkerNamen: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="none" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="maand"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={72}
          tickFormatter={(v: number) => euro(v)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 13,
          }}
          formatter={(value) => euro(Number(value))}
        />
        {medewerkerNamen.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} iconType="circle" iconSize={8} />
        )}
        {medewerkerNamen.map((naam, i) => {
          const isLast = i === medewerkerNamen.length - 1;
          return (
            <Bar
              key={naam}
              name={naam}
              dataKey={naam}
              stackId="omzet"
              fill={CHART_KLEUREN[i % CHART_KLEUREN.length]}
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              radius={isLast ? [4, 4, 0, 0] : 0}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
