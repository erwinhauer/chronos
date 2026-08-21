import { cn } from "@/lib/utils";

const KLEUREN = {
  success: "bg-success",
  muted: "bg-muted-foreground/40",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function StatusDot({
  label,
  tint,
  className,
}: {
  label: string;
  tint: keyof typeof KLEUREN;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", KLEUREN[tint])} />
      {label}
    </span>
  );
}
