import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTEN = {
  primary: {
    achtergrond: "bg-primary text-primary-foreground",
    label: "text-primary-foreground/60",
    icoonAchtergrond: "bg-primary-foreground/10",
    sub: "text-primary-foreground/60",
    blob: "var(--coral)",
  },
  coral: {
    achtergrond: "bg-coral text-coral-foreground",
    label: "text-coral-foreground/60",
    icoonAchtergrond: "bg-coral-foreground/10",
    sub: "text-coral-foreground/60",
    blob: "var(--primary)",
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
    <div className={cn("relative overflow-hidden rounded-2xl p-6", stijl.achtergrond, className)}>
      <div
        className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${stijl.blob} 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${stijl.blob} 0%, transparent 70%)` }}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <p className={cn("text-xs font-medium tracking-wide uppercase", stijl.label)}>{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", stijl.icoonAchtergrond)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="relative z-10 mt-5 text-3xl font-semibold tabular-figures">{value}</div>
      {sub && <p className={cn("relative z-10 mt-1 text-sm tabular-figures", stijl.sub)}>{sub}</p>}
      {children && <div className="relative z-10 mt-4">{children}</div>}
    </div>
  );
}
