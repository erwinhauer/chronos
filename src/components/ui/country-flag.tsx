import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Praktijk-landcodes uit dossiernummers die geen eigen ISO-vlag hebben (of een
// alias van een bestaande zijn) — zie ook de LANDNAMEN-uitzonderingen in
// src/lib/dossiernummer.ts.
const FLAG_ALIAS: Record<string, string> = { UK: "gb" };
const GEEN_VLAG = new Set(["WO", "BX"]);

function flagCode(iso: string | null): string | null {
  if (!iso) return null;
  const upper = iso.toUpperCase();
  if (GEEN_VLAG.has(upper)) return null;
  return (FLAG_ALIAS[upper] ?? upper).toLowerCase();
}

export function CountryFlag({ iso, naam, className }: { iso: string | null; naam?: string; className?: string }) {
  const code = flagCode(iso);
  if (!code) {
    return (
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          className
        )}
        title={naam}
      >
        <Globe className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className={cn("h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted", className)} title={naam}>
      <span className={`fi fis fi-${code} block`} style={{ fontSize: "2rem" }} />
    </div>
  );
}
