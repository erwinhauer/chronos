import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TINTEN = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

export function StatIcon({
  icon: Icon,
  tint,
  className,
}: {
  icon: LucideIcon;
  tint: keyof typeof TINTEN;
  className?: string;
}) {
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", TINTEN[tint], className)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}
