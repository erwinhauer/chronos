"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { euro } from "@/lib/factuurbedragen";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTh } from "@/components/sortable-th";
import { sortRows, type SortRichting } from "@/lib/table-utils";

export type KlantOmzetRij = {
  klantId: string;
  naam: string;
  valuta: string;
  gefactureerd: number;
  aantalItems: number;
  aantalSpecificaties: number;
};

type SortKey = "klant" | "gefactureerd" | "aantalItems" | "aantalSpecificaties";

export function KlantenTabel({ klanten }: { klanten: KlantOmzetRij[] }) {
  const [zoek, setZoek] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("gefactureerd");
  const [sortRichting, setSortRichting] = useState<SortRichting>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortRichting((r) => (r === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortRichting(key === "klant" ? "asc" : "desc");
    }
  }

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const gefilterd = q ? klanten.filter((k) => k.naam.toLowerCase().includes(q)) : klanten;
    const keyFn = {
      klant: (k: KlantOmzetRij) => k.naam,
      gefactureerd: (k: KlantOmzetRij) => k.gefactureerd,
      aantalItems: (k: KlantOmzetRij) => k.aantalItems,
      aantalSpecificaties: (k: KlantOmzetRij) => k.aantalSpecificaties,
    }[sortKey];
    return sortRows(gefilterd, keyFn, sortRichting);
  }, [klanten, zoek, sortKey, sortRichting]);

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
                  label="Gefactureerd"
                  actief={sortKey === "gefactureerd"}
                  richting={sortRichting}
                  onClick={() => toggleSort("gefactureerd")}
                  className="text-right"
                />
                <SortableTh
                  label="Factuuritems"
                  actief={sortKey === "aantalItems"}
                  richting={sortRichting}
                  onClick={() => toggleSort("aantalItems")}
                  className="text-right"
                />
                <SortableTh
                  label="Specificaties"
                  actief={sortKey === "aantalSpecificaties"}
                  richting={sortRichting}
                  onClick={() => toggleSort("aantalSpecificaties")}
                  className="text-right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {zichtbaar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {klanten.length === 0 ? "Nog geen gefactureerde klanten." : "Geen klanten gevonden."}
                  </TableCell>
                </TableRow>
              ) : (
                zichtbaar.map((k) => (
                  <TableRow key={k.klantId}>
                    <TableCell className="font-medium">
                      <Link href={`/klanten/${k.klantId}`} className="hover:underline">
                        {k.naam}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(k.gefactureerd, k.valuta)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{k.aantalItems}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{k.aantalSpecificaties}</Badge>
                    </TableCell>
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
