import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroTile({
  label,
  value,
  sub,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground", className)}>
      <div
        className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, var(--coral) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-primary-foreground/60 uppercase">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="relative z-10 mt-5 text-3xl font-semibold tabular-figures">{value}</div>
      {sub && <p className="relative z-10 mt-1 text-sm text-primary-foreground/60 tabular-figures">{sub}</p>}
      {children && <div className="relative z-10 mt-4">{children}</div>}
    </div>
  );
}
