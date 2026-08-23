"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, EyeOff } from "lucide-react";
import type { FactuurItemFormState } from "@/actions/factuuritems";
import { wisselKlantTaal } from "@/actions/klanten";
import { createClient } from "@/lib/supabase/client";
import { DossiernummerTagInput } from "@/components/dossiernummer-tag-input";
import { KlantCombobox } from "@/components/klant-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PrijsType, KortingType } from "@/lib/supabase/types";

type Klant = {
  id: string;
  naam: string;
  adres: string | null;
  kantoorkosten_actief: boolean;
  kantoorkosten_percentage: number;
  specificatietaal: "nl" | "en";
};
type Project = { id: string; naam: string; po_nummer: string | null };

type Initial = {
  id: string;
  dossiernummers: string[];
  klant_id: string;
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
  klanten: klantenProp,
  projectenPerKlant,
  action,
  initial,
  medewerkerId,
}: {
  klanten: Klant[];
  projectenPerKlant: Record<string, Project[]>;
  action: (prevState: FactuurItemFormState, formData: FormData) => Promise<FactuurItemFormState>;
  initial?: Initial;
  medewerkerId: string;
}) {
  const router = useRouter();
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

  const [extraKlanten, setExtraKlanten] = useState<Klant[]>([]);
  const klanten = useMemo(() => [...klantenProp, ...extraKlanten], [klantenProp, extraKlanten]);

  const [projectId, setProjectId] = useState(initial?.project_id ?? "");
  const [dossierSelectie, setDossierSelectie] = useState<string[]>(initial?.dossiernummers ?? []);
  const [klantId, setKlantId] = useState(initial?.klant_id ?? "");
  const [datum, setDatum] = useState(initial?.datum ?? new Date().toISOString().slice(0, 10));
  const [omschrijvingKlant, setOmschrijvingKlant] = useState(initial?.omschrijving_klant ?? "");
  const [interneOpmerking, setInterneOpmerking] = useState(initial?.interne_opmerking ?? "");
  const [qtyInput, setQtyInput] = useState((initial?.qty ?? 1).toFixed(1));
  const qty = Number(qtyInput) || 0;
  const [prijstype, setPrijstype] = useState<PrijsType | "">(initial?.prijstype ?? "");
  const [tarief, setTarief] = useState<number | null>(initial?.tarief ?? null);
  const [externeKosten, setExterneKosten] = useState(initial?.externe_kosten ?? 0);
  const [kortingType, setKortingType] = useState<KortingType>(initial?.korting_type ?? "bedrag");
  const [kortingBedrag, setKortingBedrag] = useState(initial?.korting ?? 0);
  const [kortingPercentage, setKortingPercentage] = useState(initial?.korting_percentage ?? 0);
  const [kantoorkostenActief, setKantoorkostenActief] = useState(initial?.kantoorkosten_van_toepassing ?? true);
  const [declarabel, setDeclarabel] = useState(initial?.declarabel ?? true);
  const [voorgesteldTarief, setVoorgesteldTarief] = useState<number | null>(null);
  const [toonSluitenBevestiging, setToonSluitenBevestiging] = useState(false);

  // Momentopname van de startwaarden (leeg bij een nieuw item, de geladen
  // gegevens bij een bewerking) om te kunnen bepalen of de gebruiker al iets
  // heeft ingevuld/gewijzigd voordat "Sluiten" een bevestiging vraagt.
  const [startSnapshot] = useState(() => ({
    dossierSelectie: initial?.dossiernummers ?? [],
    projectId: initial?.project_id ?? "",
    omschrijvingKlant: initial?.omschrijving_klant ?? "",
    interneOpmerking: initial?.interne_opmerking ?? "",
    qty: initial?.qty ?? 1,
    prijstype: initial?.prijstype ?? "",
    tarief: initial?.tarief ?? null,
    externeKosten: initial?.externe_kosten ?? 0,
    kortingBedrag: initial?.korting ?? 0,
    kortingPercentage: initial?.korting_percentage ?? 0,
    klantId: initial?.klant_id ?? "",
  }));

  const klant = klanten.find((k) => k.id === klantId);
  const projectenVoorKlant = useMemo(() => projectenPerKlant[klantId] ?? [], [projectenPerKlant, klantId]);

  // Wanneer de klant wijzigt: kantoorkosten-standaard overnemen, de oude
  // tariefsuggestie laten vervallen en het projectveld resetten (projecten
  // horen bij een klant). Render-fase aanpassing (React-patroon), geen effect:
  // voorkomt een extra commit/re-render t.o.v. useEffect.
  const [klantIdVoorReset, setKlantIdVoorReset] = useState(klantId);
  if (klantId !== klantIdVoorReset) {
    setKlantIdVoorReset(klantId);
    setKantoorkostenActief(klant?.kantoorkosten_actief ?? true);
    setVoorgesteldTarief(null);
    setProjectId("");
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
  const kortingPercentageVanHonorarium =
    honorarium > 0 ? (kortingType === "percentage" ? kortingPercentage : (kortingBerekend / honorarium) * 100) : 0;
  const kortingTeHoog = kortingBerekend > 0 && kortingPercentageVanHonorarium > 25;

  const isFormGewijzigd =
    dossierSelectie.length !== startSnapshot.dossierSelectie.length ||
    dossierSelectie.some((id) => !startSnapshot.dossierSelectie.includes(id)) ||
    klantId !== startSnapshot.klantId ||
    projectId !== startSnapshot.projectId ||
    omschrijvingKlant !== startSnapshot.omschrijvingKlant ||
    interneOpmerking !== startSnapshot.interneOpmerking ||
    qty !== startSnapshot.qty ||
    prijstype !== startSnapshot.prijstype ||
    tarief !== startSnapshot.tarief ||
    externeKosten !== startSnapshot.externeKosten ||
    kortingBedrag !== startSnapshot.kortingBedrag ||
    kortingPercentage !== startSnapshot.kortingPercentage;

  function handleSluiten() {
    if (isFormGewijzigd) {
      setToonSluitenBevestiging(true);
    } else {
      router.push("/factuuritems");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {dossierSelectie.map((d) => (
        <input key={d} type="hidden" name="dossiernummers" value={d} />
      ))}
      <input type="hidden" name="klant_id" value={klantId} />
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
              <div className="grid gap-6 sm:grid-cols-2">
                <DossiernummerTagInput value={dossierSelectie} onChange={setDossierSelectie} />
                <div className="flex flex-col gap-2">
                  <Label>Klant</Label>
                  <KlantCombobox
                    klanten={klanten}
                    value={klantId}
                    onChange={setKlantId}
                    onKlantAangemaakt={(nieuw) => setExtraKlanten((prev) => [...prev, nieuw])}
                  />
                  {klant?.adres && (
                    <p className="text-xs whitespace-pre-line text-muted-foreground">{klant.adres}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {klant && <TaalVeld klant={klant} />}
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

              <div className="grid gap-4 sm:grid-cols-2">
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
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    onBlur={() => setQtyInput((Number(qtyInput) || 0).toFixed(1))}
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
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                  <Input
                    id="tarief_input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-6"
                    value={tarief ?? ""}
                    onChange={(e) => setTarief(e.target.value === "" ? null : Number(e.target.value))}
                    required
                  />
                </div>
                {prijstype === "uren" && voorgesteldTarief !== null && (
                  <p className="text-xs text-muted-foreground">Voorgesteld tarief: {euro(voorgesteldTarief)}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="externe_kosten_input">Kosten van derden (optioneel)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      €
                    </span>
                    <Input
                      id="externe_kosten_input"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-6"
                      value={externeKosten}
                      onChange={(e) => setExterneKosten(Number(e.target.value))}
                    />
                  </div>
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
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        €
                      </span>
                      <Input
                        id="korting_input"
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-6"
                        value={kortingBedrag}
                        onChange={(e) => setKortingBedrag(Number(e.target.value))}
                      />
                    </div>
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
                  {kortingTeHoog && (
                    <p className="text-xs font-medium text-warning">
                      Let op: dit is meer dan 25% korting op onze opslag!
                    </p>
                  )}
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
            <CardFooter className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleSluiten}>
                Sluiten
              </Button>
              <Button type="submit" disabled={pending || !klantId || dossierSelectie.length === 0} className="flex-1">
                {pending ? "Bezig…" : initial ? "Wijzigingen opslaan" : "Factuuritem aanmaken"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={toonSluitenBevestiging} onOpenChange={setToonSluitenBevestiging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
            <DialogDescription>
              Er zijn al gegevens ingevuld op dit factuuritem. Als je nu sluit, gaan deze verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToonSluitenBevestiging(false)}>
              Terug naar het formulier
            </Button>
            <Button type="button" variant="destructive" onClick={() => router.push("/factuuritems")}>
              Sluiten zonder opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function TaalVeld({ klant }: { klant: Klant }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="klant_taal">Taal</Label>
      <NativeSelect
        id="klant_taal"
        value={klant.specificatietaal}
        disabled={pending}
        onChange={(taal) => {
          startTransition(async () => {
            await wisselKlantTaal(klant.id, taal as "nl" | "en");
            router.refresh();
          });
        }}
      >
        <option value="nl">Nederlands</option>
        <option value="en">Engels</option>
      </NativeSelect>
    </div>
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
        className="h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
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
