"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Pencil } from "lucide-react";
import { updateLandnaam, type LandFormState } from "@/actions/landen";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTh } from "@/components/sortable-th";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sortRows, type SortRichting } from "@/lib/table-utils";

type Land = { iso_code: string; naam_nl: string; naam_en: string };
type SortKey = "iso_code" | "naam_nl" | "naam_en";

export function LandenTab({ landen }: { landen: Land[] }) {
  const [zoek, setZoek] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("naam_nl");
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
    const gefilterd = q
      ? landen.filter(
          (l) =>
            l.naam_nl.toLowerCase().includes(q) ||
            l.naam_en.toLowerCase().includes(q) ||
            l.iso_code.toLowerCase().includes(q)
        )
      : landen;
    const keyFn = { iso_code: (l: Land) => l.iso_code, naam_nl: (l: Land) => l.naam_nl, naam_en: (l: Land) => l.naam_en }[
      sortKey
    ];
    return sortRows(gefilterd, keyFn, sortRichting);
  }, [landen, zoek, sortKey, sortRichting]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op landnaam of ISO-code…"
          className="pl-8"
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh
                  label="ISO-code"
                  actief={sortKey === "iso_code"}
                  richting={sortRichting}
                  onClick={() => toggleSort("iso_code")}
                />
                <SortableTh
                  label="Naam (NL)"
                  actief={sortKey === "naam_nl"}
                  richting={sortRichting}
                  onClick={() => toggleSort("naam_nl")}
                />
                <SortableTh
                  label="Naam (EN)"
                  actief={sortKey === "naam_en"}
                  richting={sortRichting}
                  onClick={() => toggleSort("naam_en")}
                />
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zichtbaar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Geen landen gevonden.
                  </TableCell>
                </TableRow>
              ) : (
                zichtbaar.map((land) => (
                  <TableRow key={land.iso_code}>
                    <TableCell className="font-mono text-xs tabular-figures">{land.iso_code}</TableCell>
                    <TableCell>{land.naam_nl}</TableCell>
                    <TableCell>{land.naam_en}</TableCell>
                    <TableCell className="text-right">
                      <LandBewerkenDialog land={land} />
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

const initialState: LandFormState = { error: null, success: false };

function LandBewerkenDialog({ land }: { land: Land }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: LandFormState, formData: FormData) => {
    const result = await updateLandnaam(land.iso_code, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="outline" aria-label={`${land.naam_nl} bewerken`} />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{land.iso_code}</DialogTitle>
            <DialogDescription>Landnaam aanpassen (NL en EN).</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="naam_nl">Naam (NL)</Label>
            <Input id="naam_nl" name="naam_nl" defaultValue={land.naam_nl} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="naam_en">Naam (EN)</Label>
            <Input id="naam_en" name="naam_en" defaultValue={land.naam_en} required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Bezig…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
