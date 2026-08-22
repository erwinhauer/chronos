import { cn } from "@/lib/utils";

export function SegmentedProgress({
  value,
  segments = 12,
  className,
}: {
  value: number;
  segments?: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const gevuld = Math.round((pct / 100) * segments);
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: segments }, (_, i) => (
        <div key={i} className={cn("h-2 flex-1 rounded-full", i < gevuld ? "bg-primary" : "bg-muted")} />
      ))}
    </div>
  );
}
