import { tagKleur } from "@/lib/tag-kleur";
import { cn } from "@/lib/utils";

function initialenVan(naam: string) {
  const delen = naam.trim().split(/\s+/).filter(Boolean);
  if (delen.length === 0) return "?";
  if (delen.length === 1) return delen[0].slice(0, 2).toUpperCase();
  return (delen[0][0] + delen[delen.length - 1][0]).toUpperCase();
}

export function AvatarInitials({ naam, className }: { naam: string; className?: string }) {
  const kleur = tagKleur(naam);
  return (
    <div
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium", className)}
      style={{ color: kleur, backgroundColor: `color-mix(in oklch, ${kleur} 18%, transparent)` }}
    >
      {initialenVan(naam)}
    </div>
  );
}
