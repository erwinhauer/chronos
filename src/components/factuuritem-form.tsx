"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FactuurItemFormState } from "@/actions/factuuritems";
import { createClient } from "@/lib/supabase/client";
import { parseDossiernummer, DOSSIERNUMMER_VOORBEELD } from "@/lib/dossiernummer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Klant = { id: string; naam: string; kantoorkosten_actief: boolean };

type Initial = {
  id: string;
  klant_id: string;
  dossiernummer: string;
  datum: string;
  omschrijving_klant: string;
  interne_opmerking: string | null;
  eenheidstype: string;
  qty: number;
  tarief: number | null;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  kantoorkosten_van_toepassing: boolean;
  declarabel: boolean;
};

const EENHEDEN = ["uren", "stuks", "landen", "registraties", "overig"];

const initialState: FactuurItemFormState = { error: null, success: false };

function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function FactuurItemForm({
  klanten,
  action,
  initial,
  medewerkerId,
}: {
  klanten: Klant[];
  action: (prevState: FactuurItemFormState, formData: FormData) => Promise<FactuurItemFormState>;
  initial?: Initial;
  medewerkerId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  // React reset native <select>-elementen na elke form-action (ook bij een
  // foutmelding), waarbij de DOM-waarde losraakt van de React-state ("value"
  // wordt dan niet opnieuw toegepast omdat de prop zelf niet wijzigde). Een
  // remount na elke actie herstelt de select naar de daadwerkelijke state.
  const [selectResetKey, setSelectResetKey] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setSelectResetKey((k) => k + 1);
  }

  const [klantId, setKlantId] = useState(initial?.klant_id ?? "");
  const [dossiernummer, setDossiernummer] = useState(initial?.dossiernummer ?? "");
  const [datum, setDatum] = useState(initial?.datum ?? new Date().toISOString().slice(0, 10));
  const [omschrijvingKlant, setOmschrijvingKlant] = useState(initial?.omschrijving_klant ?? "");
  const [interneOpmerking, setInterneOpmerking] = useState(initial?.interne_opmerking ?? "");
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const initieelVastHonorarium = !!initial && initial.tarief === null;
  const [vastHonorariumActief, setVastHonorariumActief] = useState(initieelVastHonorarium);
  const [tarief, setTarief] = useState<number | null>(initial?.tarief ?? null);
  const [vastHonorarium, setVastHonorarium] = useState<number>(
    initieelVastHonorarium ? (initial?.honorarium ?? 0) : 0
  );
  const [externeKosten, setExterneKosten] = useState(initial?.externe_kosten ?? 0);
  const [korting, setKorting] = useState(initial?.korting ?? 0);
  const [kantoorkostenActief, setKantoorkostenActief] = useState(initial?.kantoorkosten_van_toepassing ?? true);
  const [declarabel, setDeclarabel] = useState(initial?.declarabel ?? true);
  const [voorgesteldTarief, setVoorgesteldTarief] = useState<number | null>(null);

  const dossierPreview = useMemo(() => parseDossiernummer(dossiernummer), [dossiernummer]);

  // Wanneer de klant wijzigt: kantoorkosten-standaard overnemen en de oude
  // tariefsuggestie laten vervallen. Render-fase aanpassing (React-patroon),
  // geen effect: voorkomt een extra commit/re-render t.o.v. useEffect.
  const [klantIdVoorReset, setKlantIdVoorReset] = useState(klantId);
  if (klantId !== klantIdVoorReset) {
    setKlantIdVoorReset(klantId);
    const klant = klanten.find((k) => k.id === klantId);
    setKantoorkostenActief(klant?.kantoorkosten_actief ?? true);
    setVoorgesteldTarief(null);
  }

  useEffect(() => {
    if (!klantId || !datum) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .rpc("resolve_tarief", { p_klant_id: klantId, p_medewerker_id: medewerkerId, p_datum: datum })
      .then(({ data }) => {
        if (cancelled) return;
        setVoorgesteldTarief(typeof data === "number" ? data : null);
        if (!initial && typeof data === "number" && tarief === null) {
          setTarief(data);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klantId, datum, medewerkerId]);

  const honorarium = vastHonorariumActief ? vastHonorarium : round2(qty * (tarief ?? 0));
  const regelbedrag = round2(honorarium + externeKosten - korting);
  const kantoorkostenBedrag = kantoorkostenActief ? round2(regelbedrag * 0.06) : 0;
  const tariefWijktAf =
    !vastHonorariumActief && voorgesteldTarief !== null && tarief !== null && Math.abs(voorgesteldTarief - tarief) > 0.001;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="dossiernummer" value={dossiernummer} />
      <input type="hidden" name="datum" value={datum} />
      <input type="hidden" name="qty" value={qty} />
      <input type="hidden" name="vast_honorarium_actief" value={vastHonorariumActief ? "on" : ""} />
      {!vastHonorariumActief && <input type="hidden" name="tarief" value={tarief ?? ""} />}
      {vastHonorariumActief && <input type="hidden" name="vast_honorarium" value={vastHonorarium} />}
      <input type="hidden" name="externe_kosten" value={externeKosten} />
      <input type="hidden" name="korting" value={korting} />
      <input type="hidden" name="kantoorkosten_van_toepassing" value={kantoorkostenActief ? "on" : ""} />
      <input type="hidden" name="declarabel" value={declarabel ? "on" : ""} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dossier en werkzaamheid</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="klant">Klant</Label>
                  <NativeSelect
                    key={`klant-${selectResetKey}`}
                    id="klant"
                    name="klant_id"
                    value={klantId}
                    onChange={setKlantId}
                    required
                  >
                    <option value="" disabled>
                      Kies een klant
                    </option>
                    {klanten.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.naam}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dossiernummer_input">Dossier</Label>
                  <Input
                    id="dossiernummer_input"
                    value={dossiernummer}
                    onChange={(e) => setDossiernummer(e.target.value.toUpperCase())}
                    placeholder={DOSSIERNUMMER_VOORBEELD}
                    required
                  />
                  {dossiernummer && (
                    <p className="text-xs text-muted-foreground">
                      {dossierPreview
                        ? `${dossierPreview.typeLabel} · ${dossierPreview.landIso}`
                        : "Onbekend dossiernummerformaat"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="omschrijving_klant">Omschrijving voor klant</Label>
                <Textarea
                  id="omschrijving_klant"
                  name="omschrijving_klant"
                  rows={3}
                  value={omschrijvingKlant}
                  onChange={(e) => setOmschrijvingKlant(e.target.value)}
                  placeholder="Wat is er gedaan? Dit komt op de specificatie te staan."
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="interne_opmerking">Interne opmerking (optioneel)</Label>
                <Textarea
                  id="interne_opmerking"
                  name="interne_opmerking"
                  rows={2}
                  value={interneOpmerking}
                  onChange={(e) => setInterneOpmerking(e.target.value)}
                  placeholder="Alleen intern zichtbaar."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="datum">Datum</Label>
                  <Input
                    id="datum"
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="eenheidstype">Eenheid</Label>
                  <NativeSelect
                    id="eenheidstype"
                    name="eenheidstype"
                    defaultValue={initial?.eenheidstype ?? "uren"}
                  >
                    {EENHEDEN.map((e) => (
                      <option key={e} value={e}>
                        {e.charAt(0).toUpperCase() + e.slice(1)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="qty">Aantal (Qty)</Label>
                  <Input
                    id="qty"
                    type="number"
                    step="0.1"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Honorarium en kosten</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={vastHonorariumActief}
                  onCheckedChange={(checked) => setVastHonorariumActief(checked === true)}
                />
                Vast honorarium in plaats van aantal &times; tarief
              </label>

              {vastHonorariumActief ? (
                <div className="flex flex-col gap-2 sm:w-64">
                  <Label htmlFor="vast_honorarium_input">Vast honorarium</Label>
                  <Input
                    id="vast_honorarium_input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={vastHonorarium}
                    onChange={(e) => setVastHonorarium(Number(e.target.value))}
                    required
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:w-64">
                  <Label htmlFor="tarief_input">Tarief</Label>
                  <Input
                    id="tarief_input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tarief ?? ""}
                    onChange={(e) => setTarief(e.target.value === "" ? null : Number(e.target.value))}
                    required
                  />
                  {voorgesteldTarief !== null && (
                    <p className="text-xs text-muted-foreground">
                      Voorgesteld tarief: {euro(voorgesteldTarief)}
                      {tariefWijktAf && (
                        <span className="ml-1 font-medium text-coral-foreground">
                          — wijkt af, wordt gelogd
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="externe_kosten_input">Kosten van derden (optioneel)</Label>
                  <Input
                    id="externe_kosten_input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={externeKosten}
                    onChange={(e) => setExterneKosten(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="korting_input">Korting (optioneel, max. 1 per regel)</Label>
                  <Input
                    id="korting_input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={korting}
                    onChange={(e) => setKorting(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={kantoorkostenActief}
                    onCheckedChange={(checked) => setKantoorkostenActief(checked === true)}
                  />
                  Kantoorkosten (6%) van toepassing op deze regel
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={declarabel} onCheckedChange={(checked) => setDeclarabel(checked === true)} />
                  Declarabel
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Overzicht regel</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Honorarium" value={euro(honorarium)} />
              <Row label="Kosten van derden" value={euro(externeKosten)} />
              <Row label="Korting" value={`- ${euro(korting)}`} />
              <div className="my-1 border-t border-border" />
              <Row label="Regelbedrag" value={euro(regelbedrag)} bold />
              <Row label="Kantoorkosten (6%)" value={kantoorkostenActief ? euro(kantoorkostenBedrag) : "n.v.t."} />
              <div className="my-1 border-t border-border" />
              <Row label="Totaal" value={euro(round2(regelbedrag + kantoorkostenBedrag))} bold />
            </CardContent>
            {state.error && (
              <CardContent className="pt-0">
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              </CardContent>
            )}
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" name="actie" value="concept" variant="outline" disabled={pending} className="w-full">
                Opslaan als concept
              </Button>
              <Button type="submit" name="actie" value="indienen" disabled={pending} className="w-full">
                {pending ? "Bezig…" : "Opslaan en indienen"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="tabular-figures">{value}</span>
    </div>
  );
}

function NativeSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  children,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
