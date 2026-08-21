"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createFacturatiebatch, type FactureerFormState } from "@/actions/facturatie";
import { berekenBtw, round2 } from "@/lib/factuurbedragen";
import type { LandenMap } from "@/lib/landen";
import { FactuurCover } from "@/components/factuur-cover";
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

type Klant = FactuurSpecificatieKlant & {
  id: string;
  valuta: string;
  contact_email: string | null;
  accountview_debiteurnummer: string | null;
  verzending_toegestaan: boolean;
  btw_percentage: number;
  btw_vermelding: string | null;
};
type Project = { naam: string; po_nummer: string | null } | null;

type BasisTotalen = {
  totaal_honorarium: number;
  totaal_externe_kosten: number;
  totaal_korting: number;
  totaal_kantoorkosten: number;
  subtotaal_voor_extra_korting: number;
};

const initialState: FactureerFormState = { error: null, success: false };

export function NieuweFactuurForm({
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
  const [state, formAction, pending] = useActionState(createFacturatiebatch, initialState);
  const [toonBevestiging, setToonBevestiging] = useState(false);
  const [start, setStart] = useState(periodeStart);
  const [eind, setEind] = useState(periodeEind);
  const [extraKorting, setExtraKorting] = useState(0);
  const [email, setEmail] = useState(klant.contact_email ?? "");
  const [cc, setCc] = useState("");

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
  const btwBedrag = berekenBtw(totalen.totaal_bedrag, klant.btw_percentage);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="klant_id" value={klant.id} />
      {itemIds.map((id) => (
        <input key={id} type="hidden" name="item_ids" value={id} />
      ))}
      <input type="hidden" name="extra_korting" value={extraKorting} />
      <input type="hidden" name="verzend_email" value={email} />
      <input type="hidden" name="verzend_cc" value={cc} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factuurgegevens</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="extra_korting_input">Extra korting op deze factuur (optioneel)</Label>
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
                Extra korting kan niet groter zijn dan het factuurbedrag.
              </p>
            )}
          </div>
          {klant.verzending_toegestaan ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email_input">E-mailadres debiteur</Label>
                <Input
                  id="email_input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="cc_input">Cc (optioneel, gescheiden door komma&apos;s)</Label>
                <Input id="cc_input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="naam@knijff.com" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Deze klant werkt met een eigen billing-systeem — er wordt alleen een PDF aangemaakt, geen e-mail
              verstuurd.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voorbeeldfactuur</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 print:hidden">
          <FactuurVoorbeeldKaart>
            <FactuurCover
              klant={klant}
              project={project}
              valuta={klant.valuta}
              periodeStart={start}
              periodeEind={eind}
              totalen={totalen}
              btwPercentage={klant.btw_percentage}
              btwBedrag={btwBedrag}
              btwVermelding={klant.btw_vermelding}
            />
          </FactuurVoorbeeldKaart>
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
          <Button
            type="button"
            disabled={pending || extraKortingTeHoog}
            onClick={() => setToonBevestiging(true)}
          >
            {pending ? "Bezig…" : klant.verzending_toegestaan ? "Bevestigen en factuur aanmaken" : "Bevestigen en PDF aanmaken"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={toonBevestiging} onOpenChange={setToonBevestiging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
            <DialogDescription>
              Na bevestigen wordt de factuur definitief en kunnen de geselecteerde factuuritems niet meer
              aangepast worden.
              {!klant.verzending_toegestaan && " Er wordt alleen een PDF aangemaakt, geen e-mail verstuurd."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToonBevestiging(false)}>
              Terug naar het voorbeeld
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setToonBevestiging(false);
                formRef.current?.requestSubmit();
              }}
            >
              {pending ? "Bezig…" : "Ja, factuur aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
