"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { genereerSpecificatie, type SpecificatieFormState } from "@/actions/specificaties";
import { round2 } from "@/lib/factuurbedragen";
import type { LandenMap } from "@/lib/landen";
import {
  FactuurSpecificatie,
  type FactuurSpecificatieItem,
  type FactuurSpecificatieKlant,
} from "@/components/factuur-specificatie";
import { FactuurVoorbeeldKaart } from "@/components/factuur-voorbeeld-kaart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Klant = FactuurSpecificatieKlant & { id: string; valuta: string };
type Project = { naam: string; po_nummer: string | null } | null;

type BasisTotalen = {
  totaal_honorarium: number;
  totaal_externe_kosten: number;
  totaal_korting: number;
  totaal_kantoorkosten: number;
  subtotaal_voor_extra_korting: number;
};

const initialState: SpecificatieFormState = { error: null, success: false };

export function NieuweSpecificatieForm({
  klant,
  project,
  itemIds,
  periodeStart,
  periodeEind,
  items,
  basisTotalen,
  landen,
}: {
  klant: Klant;
  project: Project;
  itemIds: string[];
  periodeStart: string;
  periodeEind: string;
  items: FactuurSpecificatieItem[];
  basisTotalen: BasisTotalen;
  landen: LandenMap;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(genereerSpecificatie, initialState);
  const [toonBevestiging, setToonBevestiging] = useState(false);
  const [start, setStart] = useState(periodeStart);
  const [eind, setEind] = useState(periodeEind);
  const [extraKorting, setExtraKorting] = useState(0);

  const totalen = useMemo(
    () => ({
      totaal_honorarium: basisTotalen.totaal_honorarium,
      totaal_externe_kosten: basisTotalen.totaal_externe_kosten,
      totaal_korting: basisTotalen.totaal_korting,
      totaal_kantoorkosten: basisTotalen.totaal_kantoorkosten,
      extra_korting: extraKorting,
      totaal_bedrag: round2(basisTotalen.subtotaal_voor_extra_korting - extraKorting),
    }),
    [basisTotalen, extraKorting]
  );

  const extraKortingTeHoog = extraKorting > basisTotalen.subtotaal_voor_extra_korting;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="klant_id" value={klant.id} />
      {itemIds.map((id) => (
        <input key={id} type="hidden" name="item_ids" value={id} />
      ))}
      <input type="hidden" name="extra_korting" value={extraKorting} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specificatiegegevens</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {project && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Project: {project.naam}
              {project.po_nummer ? ` (PO ${project.po_nummer})` : ""}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="periode_start">Periode start</Label>
            <Input
              id="periode_start"
              name="periode_start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="periode_eind">Periode eind</Label>
            <Input
              id="periode_eind"
              name="periode_eind"
              type="date"
              value={eind}
              onChange={(e) => setEind(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="extra_korting_input">Extra korting op deze specificatie (optioneel)</Label>
            <Input
              id="extra_korting_input"
              type="number"
              step="0.01"
              min="0"
              value={extraKorting}
              onChange={(e) => setExtraKorting(Number(e.target.value))}
            />
            {extraKortingTeHoog && (
              <p className="text-xs font-medium text-destructive">
                Extra korting kan niet groter zijn dan het bedrag van de specificatie.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specificatie</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 print:hidden">
          <FactuurVoorbeeldKaart>
            <FactuurSpecificatie
              klant={klant}
              valuta={klant.valuta}
              periodeStart={start}
              periodeEind={eind}
              items={items}
              totalen={totalen}
              landen={landen}
            />
          </FactuurVoorbeeldKaart>
        </CardContent>
        {state.error && (
          <CardContent className="pt-0">
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          </CardContent>
        )}
        <CardFooter className="justify-end">
          <Button type="button" disabled={pending || extraKortingTeHoog} onClick={() => setToonBevestiging(true)}>
            {pending ? "Bezig…" : "Bevestigen en specificatie maken"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={toonBevestiging} onOpenChange={setToonBevestiging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
            <DialogDescription>
              Na bevestigen wordt de specificatie vastgelegd en kunnen de geselecteerde factuuritems niet meer
              aangepast worden. Het daadwerkelijke factureren gebeurt daarna handmatig, buiten Chronos om.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToonBevestiging(false)}>
              Terug naar de specificatie
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setToonBevestiging(false);
                formRef.current?.requestSubmit();
              }}
            >
              {pending ? "Bezig…" : "Ja, specificatie maken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
