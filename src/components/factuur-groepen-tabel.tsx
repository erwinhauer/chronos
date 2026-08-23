"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { euro } from "@/lib/factuurbedragen";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTh } from "@/components/sortable-th";
import { sortRows, type SortRichting } from "@/lib/table-utils";

export type FactuurGroepSamenvatting = {
  klantId: string;
  klantNaam: string;
  aantalItems: number;
  oudsteDatum: string;
  bedrag: number;
};

type SortKey = "klant" | "aantal" | "oudste" | "bedrag";

export function FactuurGroepenTabel({ groepen }: { groepen: FactuurGroepSamenvatting[] }) {
  const [zoek, setZoek] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("klant");
  const [sortRichting, setSortRichting] = useState<SortRichting>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortRichting((r) => (r === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortRichting("asc");
    }
  }

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const gefilterd = q ? groepen.filter((g) => g.klantNaam.toLowerCase().includes(q)) : groepen;
    const keyFn = {
      klant: (g: FactuurGroepSamenvatting) => g.klantNaam,
      aantal: (g: FactuurGroepSamenvatting) => g.aantalItems,
      oudste: (g: FactuurGroepSamenvatting) => g.oudsteDatum,
      bedrag: (g: FactuurGroepSamenvatting) => g.bedrag,
    }[sortKey];
    return sortRows(gefilterd, keyFn, sortRichting);
  }, [groepen, zoek, sortKey, sortRichting]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op klant…" className="pl-8" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh label="Klant" actief={sortKey === "klant"} richting={sortRichting} onClick={() => toggleSort("klant")} />
                <SortableTh
                  label="Aantal factuuritems"
                  actief={sortKey === "aantal"}
                  richting={sortRichting}
                  onClick={() => toggleSort("aantal")}
                />
                <SortableTh
                  label="Oudste item"
                  actief={sortKey === "oudste"}
                  richting={sortRichting}
                  onClick={() => toggleSort("oudste")}
                />
                <SortableTh
                  label="Bedrag"
                  actief={sortKey === "bedrag"}
                  richting={sortRichting}
                  onClick={() => toggleSort("bedrag")}
                  className="text-right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {zichtbaar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {groepen.length === 0 ? "Geen openstaande factuuritems." : "Geen klanten gevonden."}
                  </TableCell>
                </TableRow>
              ) : (
                zichtbaar.map((g) => (
                  <TableRow key={g.klantId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <AvatarInitials naam={g.klantNaam} />
                        <Link href={`/factuuritems/klant/${g.klantId}`} className="hover:underline">
                          {g.klantNaam}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{g.aantalItems}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(g.oudsteDatum).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(g.bedrag)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
