import { cn } from "@/lib/utils";

export function ChronosMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M20 9.5V20L27 24.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="2" fill="var(--coral)" />
    </svg>
  );
}

export function ChronosLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <ChronosMark className={cn("h-6 w-6 text-current", markClassName)} />
      <span className="text-lg font-semibold tracking-tight">Chronos</span>
    </div>
  );
}
