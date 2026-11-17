"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createMelding,
  updateMelding,
  setMeldingActief,
  deleteMelding,
  type MeldingFormState,
} from "@/actions/meldingen";
import { MeldingBlok, MELDING_SOORT_LABELS, type MeldingSoort } from "@/components/melding-blok";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { dateNaAmsterdamInvoer, formatteerAmsterdam } from "@/lib/amsterdam-tijd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type MeldingRij = {
  id: string;
  soort: MeldingSoort;
  tekst: string;
  wegklikbaar: boolean;
  actief: boolean;
  verloopt_op: string | null;
  created_at: string;
  gemaaktDoor: string | null;
};

const MAX_TEKST = 500;
const initialState: MeldingFormState = { error: null, success: false };

export function MeldingenTab({ meldingen }: { meldingen: MeldingRij[] }) {
  const [formKey, setFormKey] = useState(0);
  const [nieuwOpen, setNieuwOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Een melding staat bovenin Chronos bij alle gebruikers, bijvoorbeeld bij een storing of gepland onderhoud. Een
          wegklikbare melding verschijnt één keer per inlogsessie en kan de gebruiker sluiten. Een niet-wegklikbare
          melding blijft op elke pagina staan. Met een verloopdatum verdwijnt de melding vanzelf, ook uit deze lijst.
          Open tabbladen pakken een nieuwe melding binnen vijf minuten op.
        </p>
        <Dialog
          open={nieuwOpen}
          onOpenChange={(o) => {
            setNieuwOpen(o);
            if (o) setFormKey((k) => k + 1);
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4" />
            Nieuwe melding
          </DialogTrigger>
          <DialogContent>
            <MeldingDialogBody
              key={formKey}
              titel="Nieuwe melding"
              omschrijving="De melding staat direct bovenin Chronos bij alle gebruikers."
              knop="Melding plaatsen"
              actie={createMelding}
              onDone={() => setNieuwOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {meldingen.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Er zijn nog geen meldingen.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {meldingen.map((m) => (
            <MeldingKaart key={m.id} melding={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MeldingKaart({ melding }: { melding: MeldingRij }) {
  const [bewerkOpen, setBewerkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function wisselActief(actief: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setMeldingActief(melding.id, actief);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="gap-0 py-0">
      <MeldingBlok soort={melding.soort} tekst={melding.tekst} className={melding.actief ? "" : "opacity-50"} />
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="text-xs text-muted-foreground">
          {melding.actief ? "Staat aan" : "Staat uit"} · {melding.wegklikbaar ? "wegklikbaar" : "niet wegklikbaar"} ·
          geplaatst {formatteerAmsterdam(melding.created_at)}
          {melding.gemaaktDoor ? ` door ${melding.gemaaktDoor}` : ""} ·{" "}
          {melding.verloopt_op ? `verloopt op ${formatteerAmsterdam(melding.verloopt_op)}` : "verloopt niet"}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={melding.actief}
              disabled={pending}
              onCheckedChange={(checked) => wisselActief(checked === true)}
              aria-label={melding.actief ? "Melding uitzetten" : "Melding aanzetten"}
            />
            {melding.actief ? "Aan" : "Uit"}
          </label>
          <Dialog open={bewerkOpen} onOpenChange={setBewerkOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Pencil className="h-4 w-4" />
              Bewerken
            </DialogTrigger>
            <DialogContent>
              <MeldingDialogBody
                titel="Melding bewerken"
                omschrijving="Na het opslaan krijgt iedereen de melding opnieuw te zien, ook wie hem in deze sessie al had gezien."
                knop="Opslaan"
                melding={melding}
                actie={(prev, formData) => updateMelding(melding.id, prev, formData)}
                onDone={() => setBewerkOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <VerwijderMeldingDialog melding={melding} />
        </div>
        {error && (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MeldingDialogBody({
  titel,
  omschrijving,
  knop,
  melding,
  actie,
  onDone,
}: {
  titel: string;
  omschrijving: string;
  knop: string;
  melding?: MeldingRij;
  actie: (prev: MeldingFormState, formData: FormData) => Promise<MeldingFormState>;
  onDone: () => void;
}) {
  const [soort, setSoort] = useState<MeldingSoort>(melding?.soort ?? "info");
  const [tekst, setTekst] = useState(melding?.tekst ?? "");
  const [wegklikbaar, setWegklikbaar] = useState(melding?.wegklikbaar ?? true);
  const [state, formAction, pending] = useActionState(async (prev: MeldingFormState, formData: FormData) => {
    const result = await actie(prev, formData);
    if (result.success) onDone();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="wegklikbaar" value={wegklikbaar ? "on" : ""} />
      <DialogHeader>
        <DialogTitle>{titel}</DialogTitle>
        <DialogDescription>{omschrijving}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="melding_soort">Soort</Label>
        <NativeSelect
          id="melding_soort"
          name="soort"
          value={soort}
          onChange={(e) => setSoort(e.target.value as MeldingSoort)}
        >
          {(Object.keys(MELDING_SOORT_LABELS) as MeldingSoort[]).map((s) => (
            <option key={s} value={s}>
              {MELDING_SOORT_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="melding_tekst">Tekst</Label>
        <Textarea
          id="melding_tekst"
          name="tekst"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          maxLength={MAX_TEKST}
          rows={3}
          placeholder="Bijvoorbeeld: Chronos is vanavond tussen 22.00 en 23.00 uur niet bereikbaar wegens onderhoud."
          required
        />
        <p className="text-right text-xs text-muted-foreground">
          {tekst.length} / {MAX_TEKST}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={wegklikbaar} onCheckedChange={(checked) => setWegklikbaar(checked === true)} />
        Gebruikers mogen deze melding wegklikken
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor="melding_verloopt_op">Verloopt op (optioneel)</Label>
        <Input
          id="melding_verloopt_op"
          name="verloopt_op"
          type="datetime-local"
          className="w-64"
          defaultValue={dateNaAmsterdamInvoer(melding?.verloopt_op ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          Vanaf dit moment (Nederlandse tijd) wordt de melding niet meer getoond en verdwijnt hij uit deze lijst. Laat
          leeg als de melding niet moet verlopen.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Zo ziet de melding eruit</span>
        <div className="overflow-hidden rounded-lg border">
          <MeldingBlok
            soort={soort}
            tekst={tekst.trim() || "Hier komt de tekst van de melding."}
            onSluit={wegklikbaar ? () => {} : undefined}
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Bezig…" : knop}
        </Button>
      </DialogFooter>
    </form>
  );
}

function VerwijderMeldingDialog({ melding }: { melding: MeldingRij }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function bevestig() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMelding(melding.id);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
    >
      <DialogTrigger render={<Button size="icon-sm" variant="outline" aria-label="Melding verwijderen" />}>
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Melding verwijderen?</DialogTitle>
          <DialogDescription>
            De melding verdwijnt bij alle gebruikers en kan niet worden teruggehaald. Wil je hem alleen tijdelijk
            verbergen, zet hem dan uit.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button type="button" variant="destructive" onClick={bevestig} disabled={pending}>
            {pending ? "Bezig…" : "Verwijderen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
