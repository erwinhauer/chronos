"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { euro } from "@/lib/factuurbedragen";
import { DownloadSpecificatieKnop } from "@/components/download-specificatie-knop";
import { KopieerDossiernummersKnop } from "@/components/kopieer-dossiernummers-knop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SpecificatieItem = {
  id: string;
  datum: string;
  omschrijvingKlant: string;
  qty: number;
  eenheidstype: string;
  bedrag: number;
  dossiernummers: string[];
  dossiernamen: string[];
  landNamen: string[];
};

type Specificatie = {
  id: string;
  periodeStart: string;
  periodeEind: string;
  createdAt: string;
  totaalBedrag: number;
  items: SpecificatieItem[];
};

function itemMatcht(item: SpecificatieItem, zoekterm: string) {
  const haystack = [
    item.omschrijvingKlant,
    ...item.dossiernummers,
    ...item.dossiernamen,
    ...item.landNamen,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(zoekterm);
}

function SpecificatieRij({
  specificatie,
  valuta,
  items,
  geforceerdOpen,
}: {
  specificatie: Specificatie;
  valuta: string;
  items: SpecificatieItem[];
  geforceerdOpen: boolean;
}) {
  const [handmatigOpen, setHandmatigOpen] = useState(false);
  const open = geforceerdOpen || handmatigOpen;
  const alleDossiernummers = Array.from(new Set(specificatie.items.flatMap((i) => i.dossiernummers)));

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-4 p-3">
        <button
          type="button"
          onClick={() => setHandmatigOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div>
            <p className="text-sm font-medium">
              {new Date(specificatie.periodeStart).toLocaleDateString("nl-NL")} –{" "}
              {new Date(specificatie.periodeEind).toLocaleDateString("nl-NL")}
            </p>
            <p className="text-xs text-muted-foreground">
              Vastgelegd op {new Date(specificatie.createdAt).toLocaleDateString("nl-NL")} ·{" "}
              {specificatie.items.length} factuuritem{specificatie.items.length === 1 ? "" : "s"}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <span className="tabular-figures font-medium">{euro(specificatie.totaalBedrag, valuta)}</span>
          <KopieerDossiernummersKnop dossiernummers={alleDossiernummers} />
          <DownloadSpecificatieKnop specificatieId={specificatie.id} />
        </div>
      </div>
      {open && (
        <div className="border-t border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Datum</TableHead>
                <TableHead className="w-40">Dossier</TableHead>
                <TableHead className="w-32">Land</TableHead>
                <TableHead>Omschrijving</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-28 text-right">Bedrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Geen factuuritems die aan de zoekterm voldoen.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(item.datum).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {item.dossiernummers.join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {item.landNamen.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{item.omschrijvingKlant}</TableCell>
                    <TableCell className="tabular-figures">
                      {item.qty} {item.eenheidstype}
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(item.bedrag, valuta)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function KlantSpecificatiesSectie({
  specificaties,
  zonderSpecificatie,
  valuta,
}: {
  specificaties: Specificatie[];
  zonderSpecificatie: Omit<SpecificatieItem, "dossiernamen" | "landNamen">[];
  valuta: string;
}) {
  const [invoer, setInvoer] = useState("");
  const zoekterm = invoer.trim().toLowerCase();

  const gefilterd = useMemo(() => {
    if (!zoekterm) return specificaties.map((s) => ({ specificatie: s, items: s.items }));
    return specificaties
      .map((s) => ({ specificatie: s, items: s.items.filter((i) => itemMatcht(i, zoekterm)) }))
      .filter((s) => s.items.length > 0);
  }, [specificaties, zoekterm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Specificaties</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            placeholder="Zoek op dossier, dossiernaam, land of omschrijving…"
            className="pl-8"
          />
        </div>

        {specificaties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen specificaties.</p>
        ) : gefilterd.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen specificaties die aan de zoekterm voldoen.</p>
        ) : (
          gefilterd.map(({ specificatie, items }) => (
            <SpecificatieRij
              key={specificatie.id}
              specificatie={specificatie}
              valuta={valuta}
              items={items}
              geforceerdOpen={zoekterm.length > 0}
            />
          ))
        )}

        {zonderSpecificatie.length > 0 && (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Definitieve factuuritems zonder specificatie
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Datum</TableHead>
                  <TableHead className="w-40">Dossier</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-28 text-right">Bedrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zonderSpecificatie.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(item.datum).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {item.dossiernummers.join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{item.omschrijvingKlant}</TableCell>
                    <TableCell className="tabular-figures">
                      {item.qty} {item.eenheidstype}
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(item.bedrag, valuta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
