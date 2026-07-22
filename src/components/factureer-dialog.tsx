"use client";

import { useActionState, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { createFacturatiebatch, type FactureerFormState } from "@/actions/facturatie";
import { euro } from "@/lib/factuurbedragen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Selectie = { id: string; datum: string; bedrag: number };

const initialState: FactureerFormState = { error: null, success: false };

export function FactureerDialog({
  klantId,
  klantNaam,
  selectie,
}: {
  klantId: string;
  klantNaam: string;
  selectie: Selectie[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createFacturatiebatch, initialState);

  const { periodeStart, periodeEind, totaal } = useMemo(() => {
    const datums = selectie.map((s) => s.datum).sort();
    return {
      periodeStart: datums[0] ?? "",
      periodeEind: datums[datums.length - 1] ?? "",
      totaal: selectie.reduce((som, s) => som + s.bedrag, 0),
    };
  }, [selectie]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={selectie.length === 0} />}>
        <Receipt className="h-4 w-4" />
        Factureren ({selectie.length})
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Factureren — {klantNaam}</DialogTitle>
            <DialogDescription>
              {selectie.length} factuuritem{selectie.length === 1 ? "" : "s"} worden definitief en gekoppeld aan een
              nieuwe factuur.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="klant_id" value={klantId} />
          {selectie.map((s) => (
            <input key={s.id} type="hidden" name="item_ids" value={s.id} />
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="periode_start">Periode start</Label>
              <Input id="periode_start" name="periode_start" type="date" defaultValue={periodeStart} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="periode_eind">Periode eind</Label>
              <Input id="periode_eind" name="periode_eind" type="date" defaultValue={periodeEind} required />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subtotaal (excl. kantoorkosten)</span>
            <span className="font-semibold tabular-figures">{euro(totaal)}</span>
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
              {pending ? "Bezig…" : "Factuur aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
