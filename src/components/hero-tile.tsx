import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// De vier kaartsoorten uit het design system: navy (het belangrijkste getal),
// geel (aandacht, bv. onderhanden werk), wit (neutraal) en zacht koraal (waarschuwing).
const VARIANTEN = {
  primary: {
    achtergrond: "bg-tile-navy text-white",
    label: "text-white/60",
    icoonAchtergrond: "bg-white/15 text-white",
    sub: "text-white/65",
  },
  geel: {
    achtergrond: "bg-geel text-geel-ink",
    label: "text-geel-ink/80",
    icoonAchtergrond: "bg-geel-ink/10 text-geel-ink",
    sub: "text-geel-ink/80",
  },
  wit: {
    achtergrond: "bg-card text-card-foreground ring-1 ring-border",
    label: "text-muted-foreground",
    icoonAchtergrond: "bg-muted text-foreground",
    sub: "text-muted-foreground",
  },
  coral: {
    achtergrond: "bg-coral-soft text-foreground",
    label: "text-muted-foreground",
    icoonAchtergrond: "bg-coral/20 text-coral",
    sub: "text-muted-foreground",
  },
} as const;

export function HeroTile({
  label,
  value,
  sub,
  icon: Icon,
  className,
  children,
  variant = "primary",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
  variant?: keyof typeof VARIANTEN;
}) {
  const stijl = VARIANTEN[variant];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-7", stijl.achtergrond, className)}>
      {Icon && (
        <span className={cn("mb-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", stijl.icoonAchtergrond)}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className={cn("text-[11px] font-medium tracking-[0.1em] uppercase", stijl.label)}>{label}</p>
      <div className="mt-2 text-4xl font-light tracking-tight tabular-figures">{value}</div>
      {sub && <p className={cn("mt-2 text-sm tabular-figures", stijl.sub)}>{sub}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
