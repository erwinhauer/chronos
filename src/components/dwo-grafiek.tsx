"use client";

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dwoKleurToken } from "@/lib/dwo-kleur";

export type DwoMaandRij = { maand: string; dagen: number | null; aantal: number };

const KLEUR: Record<ReturnType<typeof dwoKleurToken>, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  primary: "var(--primary)",
};

// DWO per maand (gemiddeld aantal dagen van itemdatum tot definitief), gekleurd volgens
// dezelfde grenzen als de tegel: tot 45 dagen goed, tot 60 aandacht, daarboven rood.
export function DwoGrafiek({ data }: { data: DwoMaandRij[] }) {
  const hoogste = Math.max(60, ...data.map((d) => d.dagen ?? 0));
  const maximum = Math.ceil((hoogste + 5) / 10) * 10;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="none" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="maand"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, maximum]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <ReferenceLine y={45} stroke="var(--warning)" strokeDasharray="4 4" />
        <ReferenceLine y={60} stroke="var(--destructive)" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 13,
          }}
          formatter={(value, _naam, item) => {
            const aantal = (item.payload as DwoMaandRij).aantal;
            return [`${String(value).replace(".", ",")} dagen · ${aantal} ${aantal === 1 ? "item" : "items"}`, "DWO"];
          }}
        />
        <Bar dataKey="dagen" maxBarSize={28} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.maand} fill={KLEUR[dwoKleurToken(d.dagen)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
