"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ChevronDown, EyeOff } from "lucide-react";
import type { FactuurItemFormState } from "@/actions/factuuritems";
import { createClient } from "@/lib/supabase/client";
import { DossierSelect, type PatriciaDossierOptie } from "@/components/dossier-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrijsType, KortingType } from "@/lib/supabase/types";

type Klant = { id: string; naam: string; kantoorkosten_actief: boolean; kantoorkosten_percentage: number };
type Project = { id: string; naam: string; po_nummer: string | null };

type Initial = {
  id: string;
  dossier_ids: string[];
  onbekende_dossiers?: { dossiernummer: string; type_dienst: string | null; land: string | null }[];
  // Alleen als weergave-terugval als geen van de dossiers op dit item (meer)
  // in de dummy-lijst voorkomt — submission herleidt de klant altijd opnieuw
  // server-side uit de daadwerkelijk geselecteerde dossiers.
  klant_id_fallback?: string;
  project_id: string | null;
  datum: string;
  omschrijving_klant: string;
  interne_opmerking: string | null;
  eenheidstype: string;
  qty: number;
  prijstype: PrijsType;
  tarief: number | null;
  externe_kosten: number;
  korting: number;
  korting_type: KortingType;
  korting_percentage: number | null;
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
  dossiers,
  projectenPerKlant,
  action,
  initial,
  medewerkerId,
}: {
  klanten: Klant[];
  dossiers: PatriciaDossierOptie[];
  projectenPerKlant: Record<string, Project[]>;
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

  const [projectId, setProjectId] = useState(initial?.project_id ?? "");
  const [dossierSelectie, setDossierSelectie] = useState<string[]>(initial?.dossier_ids ?? []);
  const [datum, setDatum] = useState(initial?.datum ?? new Date().toISOString().slice(0, 10));
  const [omschrijvingKlant, setOmschrijvingKlant] = useState(initial?.omschrijving_klant ?? "");
  const [interneOpmerking, setInterneOpmerking] = useState(initial?.interne_opmerking ?? "");
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [prijstype, setPrijstype] = useState<PrijsType | "">(initial?.prijstype ?? "");
  const [tarief, setTarief] = useState<number | null>(initial?.tarief ?? null);
  const [externeKosten, setExterneKosten] = useState(initial?.externe_kosten ?? 0);
  const [kortingType, setKortingType] = useState<KortingType>(initial?.korting_type ?? "bedrag");
  const [kortingBedrag, setKortingBedrag] = useState(initial?.korting ?? 0);
  const [kortingPercentage, setKortingPercentage] = useState(initial?.korting_percentage ?? 0);
  const [kantoorkostenActief, setKantoorkostenActief] = useState(initial?.kantoorkosten_van_toepassing ?? true);
  const [declarabel, setDeclarabel] = useState(initial?.declarabel ?? true);
  const [voorgesteldTarief, setVoorgesteldTarief] = useState<number | null>(null);

  // Klant is niet langer een handmatige keuze — hij volgt uit het/de gekozen
  // dossier(s) (allemaal van dezelfde klant, zie DossierSelect's klant-lock).
  const klantId = useMemo(() => {
    const eerste = dossiers.find((d) => dossierSelectie.includes(d.id));
    return eerste?.klant_id ?? initial?.klant_id_fallback ?? "";
  }, [dossiers, dossierSelectie, initial?.klant_id_fallback]);
  const klant = klanten.find((k) => k.id === klantId);

  const projectenVoorKlant = useMemo(() => projectenPerKlant[klantId] ?? [], [projectenPerKlant, klantId]);

  // Wanneer de (afgeleide) klant wijzigt: kantoorkosten-standaard overnemen, de
  // oude tariefsuggestie laten vervallen en het projectveld resetten (projecten
  // horen bij een klant). Render-fase aanpassing (React-patroon), geen effect:
  // voorkomt een extra commit/re-render t.o.v. useEffect.
  const [klantIdVoorReset, setKlantIdVoorReset] = useState(klantId);
  if (klantId !== klantIdVoorReset) {
    setKlantIdVoorReset(klantId);
    setKantoorkostenActief(klant?.kantoorkosten_actief ?? true);
    setVoorgesteldTarief(null);
    setProjectId("");
  }

  function handleDossierChange(nieuweSelectie: string[]) {
    if (omschrijvingKlant === "" && dossierSelectie.length === 0 && nieuweSelectie.length > 0) {
      const eerste = dossiers.find((d) => d.id === nieuweSelectie[0]);
      if (eerste) setOmschrijvingKlant(eerste.matter_naam);
    }
    setDossierSelectie(nieuweSelectie);
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

  const honorarium = round2(qty * (tarief ?? 0));
  const kortingBerekend = kortingType === "percentage" ? round2(honorarium * (kortingPercentage / 100)) : kortingBedrag;
  const regelbedrag = round2(honorarium + externeKosten - kortingBerekend);
  const kantoorkostenPercentage = klant?.kantoorkosten_percentage ?? 6;
  const kantoorkostenBedrag = kantoorkostenActief ? round2(regelbedrag * (kantoorkostenPercentage / 100)) : 0;
  const tariefWijktAf =
    prijstype === "uren" && voorgesteldTarief !== null && tarief !== null && Math.abs(voorgesteldTarief - tarief) > 0.001;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {dossierSelectie.map((id) => (
        <input key={id} type="hidden" name="dossier_ids" value={id} />
      ))}
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="datum" value={datum} />
      <input type="hidden" name="qty" value={qty} />
      <input type="hidden" name="prijstype" value={prijstype} />
      <input type="hidden" name="tarief" value={tarief ?? ""} />
      <input type="hidden" name="externe_kosten" value={externeKosten} />
      <input type="hidden" name="korting_type" value={kortingType} />
      {kortingType === "bedrag" ? (
        <input type="hidden" name="korting" value={kortingBedrag} />
      ) : (
        <input type="hidden" name="korting_percentage" value={kortingPercentage} />
      )}
      <input type="hidden" name="kantoorkosten_van_toepassing" value={kantoorkostenActief ? "on" : ""} />
      <input type="hidden" name="declarabel" value={declarabel ? "on" : ""} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dossier en werkzaamheid</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <DossierSelect
                dossiers={dossiers}
                value={dossierSelectie}
                onChange={handleDossierChange}
                onbekendeDossiers={initial?.onbekende_dossiers}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Klant</Label>
                  <p className="flex h-8 items-center text-sm font-medium">
                    {klant?.naam ?? <span className="text-muted-foreground">Kies eerst een dossier</span>}
                  </p>
                </div>
                {projectenVoorKlant.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project">Project (optioneel)</Label>
                    <NativeSelect
                      key={`project-${klantId}-${selectResetKey}`}
                      id="project"
                      value={projectId}
                      onChange={setProjectId}
                    >
                      <option value="">Geen project</option>
                      {projectenVoorKlant.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.naam}
                          {p.po_nummer ? ` (${p.po_nummer})` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
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

              <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="interne_opmerking" className="mb-0">
                    Interne opmerking (optioneel)
                  </Label>
                  <Badge variant="warning">
                    <EyeOff className="size-3" />
                    Niet zichtbaar voor klant
                  </Badge>
                </div>
                <Textarea
                  id="interne_opmerking"
                  name="interne_opmerking"
                  rows={2}
                  value={interneOpmerking}
                  onChange={(e) => setInterneOpmerking(e.target.value)}
                  placeholder="Alleen intern zichtbaar."
                  className="border-warning/40 bg-transparent focus-visible:border-warning focus-visible:ring-warning/30"
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
              <div className="flex flex-col gap-2 sm:w-64">
                <Label htmlFor="prijstype">Prijstype</Label>
                <NativeSelect
                  key={`prijstype-${selectResetKey}`}
                  id="prijstype"
                  value={prijstype}
                  onChange={(v) => setPrijstype(v as PrijsType)}
                  required
                >
                  <option value="" disabled>
                    Kies…
                  </option>
                  <option value="uren">Uren</option>
                  <option value="vast_honorarium">Fixed fee</option>
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-2 sm:w-64">
                <Label htmlFor="tarief_input">{prijstype === "vast_honorarium" ? "Vast honorarium (bedrag)" : "Prijs per uur"}</Label>
                <Input
                  id="tarief_input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tarief ?? ""}
                  onChange={(e) => setTarief(e.target.value === "" ? null : Number(e.target.value))}
                  required
                />
                {prijstype === "uren" && voorgesteldTarief !== null && (
                  <p className="text-xs text-muted-foreground">
                    Voorgesteld tarief: {euro(voorgesteldTarief)}
                    {tariefWijktAf && (
                      <span className="ml-1 font-medium text-warning">— wijkt af, wordt gelogd</span>
                    )}
                  </p>
                )}
              </div>

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="korting_input">Korting (optioneel)</Label>
                    <div className="flex overflow-hidden rounded-md border border-input">
                      <button
                        type="button"
                        onClick={() => setKortingType("bedrag")}
                        className={`px-2 py-0.5 text-xs ${kortingType === "bedrag" ? "bg-accent font-medium" : "text-muted-foreground"}`}
                      >
                        €
                      </button>
                      <button
                        type="button"
                        onClick={() => setKortingType("percentage")}
                        className={`px-2 py-0.5 text-xs ${kortingType === "percentage" ? "bg-accent font-medium" : "text-muted-foreground"}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  {kortingType === "bedrag" ? (
                    <Input
                      id="korting_input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={kortingBedrag}
                      onChange={(e) => setKortingBedrag(Number(e.target.value))}
                    />
                  ) : (
                    <Input
                      id="korting_input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={kortingPercentage}
                      onChange={(e) => setKortingPercentage(Number(e.target.value))}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Max. het honorarium ({euro(honorarium)}), nooit over kosten van derden.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={kantoorkostenActief}
                    onCheckedChange={(checked) => setKantoorkostenActief(checked === true)}
                  />
                  Kantoorkosten ({kantoorkostenPercentage}%) van toepassing op deze regel
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
              <Row label="Korting" value={`- ${euro(kortingBerekend)}`} />
              <div className="my-1 border-t border-border" />
              <Row label="Regelbedrag" value={euro(regelbedrag)} bold />
              <Row
                label={`Kantoorkosten (${kantoorkostenPercentage}%)`}
                value={kantoorkostenActief ? euro(kantoorkostenBedrag) : "n.v.t."}
              />
              <p className="text-xs text-muted-foreground">
                Indicatief per regel — het werkelijke bedrag (min. €15, max. €200) wordt per factuur bepaald.
              </p>
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
            <CardFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Bezig…" : initial ? "Wijzigingen opslaan" : "Factuuritem aanmaken"}
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
