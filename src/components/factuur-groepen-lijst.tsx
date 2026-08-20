"use client";

import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { euro } from "@/lib/factuurbedragen";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export type FactuurGroepSamenvatting = { klantId: string; klantNaam: string; aantalItems: number; bedrag: number };

export function FactuurGroepenLijst({ groepen }: { groepen: FactuurGroepSamenvatting[] }) {
  const [zoek, setZoek] = useState("");

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return q ? groepen.filter((g) => g.klantNaam.toLowerCase().includes(q)) : groepen;
  }, [groepen, zoek]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op klant…"
          className="pl-8"
        />
      </div>

      {zichtbaar.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {groepen.length === 0 ? "Geen openstaande factuuritems." : "Geen klanten gevonden."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {zichtbaar.map((g) => (
            <Link key={g.klantId} href={`/factuuritems/klant/${g.klantId}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{g.klantNaam}</p>
                    <p className="text-sm text-muted-foreground">
                      {g.aantalItems} factuuritem{g.aantalItems === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-figures">{euro(g.bedrag)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
