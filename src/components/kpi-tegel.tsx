import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTEN = {
  navy: { vlak: "bg-tile-navy text-white", label: "text-white/70", sub: "text-white/70" },
  geel: { vlak: "bg-geel text-geel-ink", label: "text-geel-ink/80", sub: "text-geel-ink/80" },
  wit: { vlak: "bg-card text-card-foreground ring-1 ring-border", label: "text-muted-foreground", sub: "text-muted-foreground" },
  coral: { vlak: "bg-coral-soft text-foreground", label: "text-muted-foreground", sub: "text-muted-foreground" },
} as const;

const euroFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Splitst een bedrag in "€ 3.770" (groot) en ",00" (kleiner) zodat het getal in één
// oogopslag leesbaar is. Negatieve bedragen houden hun min-teken vooraan.
function splitsBedrag(bedrag: number) {
  const tekst = euroFormat.format(Math.abs(bedrag));
  const komma = tekst.lastIndexOf(",");
  return { hele: `${bedrag < 0 ? "- " : ""}€ ${tekst.slice(0, komma)}`, cent: tekst.slice(komma) };
}

// KPI-tegel: de titel klein en in hoofdletters, het bedrag (of aantal dagen) heel groot.
export function KpiTegel({
  label,
  bedrag,
  dagen,
  sub,
  variant = "wit",
  grootte = "groot",
  className,
  children,
}: {
  label: string;
  bedrag?: number;
  dagen?: number | null;
  sub?: ReactNode;
  variant?: keyof typeof VARIANTEN;
  grootte?: "groot" | "middel";
  className?: string;
  children?: ReactNode;
}) {
  const stijl = VARIANTEN[variant];
  const bedragStijl =
    grootte === "groot" ? "text-5xl lg:text-[3.5rem] xl:text-6xl" : "text-4xl lg:text-[2.6rem] xl:text-5xl";
  const centStijl = grootte === "groot" ? "text-2xl xl:text-3xl" : "text-xl xl:text-2xl";

  let waarde: ReactNode;
  if (bedrag !== undefined) {
    const { hele, cent } = splitsBedrag(bedrag);
    waarde = (
      <>
        {hele}
        <span className={cn("ml-0.5 font-light opacity-70", centStijl)}>{cent}</span>
      </>
    );
  } else if (dagen === null || dagen === undefined) {
    waarde = "—";
  } else {
    waarde = (
      <>
        {new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(dagen)}
        <span className={cn("ml-2 font-light opacity-70", centStijl)}>dagen</span>
      </>
    );
  }

  return (
    <div className={cn("flex min-h-[200px] flex-col rounded-[28px] p-7", stijl.vlak, className)}>
      <p className={cn("text-[13px] font-medium tracking-[0.07em] uppercase", stijl.label)}>{label}</p>
      <div
        className={cn(
          "mt-auto pt-6 leading-none font-normal tracking-tight whitespace-nowrap tabular-figures",
          bedragStijl
        )}
      >
        {waarde}
      </div>
      {sub && <p className={cn("mt-3 text-sm", stijl.sub)}>{sub}</p>}
      {children}
    </div>
  );
}
