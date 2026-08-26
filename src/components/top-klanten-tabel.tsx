"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { euro } from "@/lib/factuurbedragen";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

export type TopKlantRij = {
  klantId: string;
  naam: string;
  omzet: number;
  perProductgroep: { code: string; label: string; omzet: number }[];
  perLand: { landNaam: string; iso: string | null; omzet: number }[];
};

// Top-klantenlijst met een per-klant uitklapbare uitsplitsing naar productgroep
// en land/regio — dezelfde rijen worden zowel bedrijfsbreed (dashboard "hele
// groep") als per team gebruikt, dus de uitklap-logica leeft hier één keer.
export function TopKlantenTabel({ rijen }: { rijen: TopKlantRij[] }) {
  const [uitgeklapt, setUitgeklapt] = useState<string | null>(null);

  if (rijen.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nog geen omzet in deze periode.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {rijen.map((r) => {
        const open = uitgeklapt === r.klantId;
        return (
          <div key={r.klantId} className="rounded-md">
            <button
              type="button"
              onClick={() => setUitgeklapt(open ? null : r.klantId)}
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
              <AvatarInitials naam={r.naam} />
              <span className="flex-1 truncate text-sm font-medium">{r.naam}</span>
              <span className="text-sm font-medium tabular-figures">{euro(r.omzet)}</span>
            </button>
            {open && (
              <div className="grid gap-4 border-t border-border px-2 py-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Omzet per productgroep
                  </p>
                  {r.perProductgroep.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Geen omzet.</p>
                  ) : (
                    r.perProductgroep.map((p) => (
                      <div key={p.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {p.code} · {p.label}
                        </span>
                        <span className="font-medium tabular-figures">{euro(p.omzet)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Omzet per land/regio
                  </p>
                  {r.perLand.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Geen omzet.</p>
                  ) : (
                    r.perLand.map((l) => (
                      <div key={l.landNaam} className="flex items-center gap-2 text-xs">
                        <CountryFlag iso={l.iso} naam={l.landNaam} className="h-4 w-4" />
                        <span className="flex-1 truncate text-muted-foreground">{l.landNaam}</span>
                        <span className="font-medium tabular-figures">{euro(l.omzet)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
