"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createFunctie,
  updateFunctie,
  deleteFunctie,
  type FunctieFormState,
} from "@/actions/functies";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FunctieRij = {
  id: string;
  naam: string;
  uurtarief: number | null;
  aantalGebruikers: number;
};

const euroFormat = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const initialState: FunctieFormState = { error: null, success: false };

export function FunctiesTab({ functies }: { functies: FunctieRij[] }) {
  const [formKey, setFormKey] = useState(0);
  const [nieuwOpen, setNieuwOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Koppel een functie aan een gebruiker bij Gebruikers. Het uurtarief van de functie wordt voorgesteld bij een
          nieuw factuuritem. Een tarief dat voor een klant of voor één medewerker is afgesproken, gaat voor het
          functietarief; het algemene kantoortarief geldt als er geen functie is. Een tariefwijziging raakt alleen nieuwe
          factuuritems, nooit bestaande.
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
            Nieuwe functie
          </DialogTrigger>
          <DialogContent>
            <FunctieDialogBody
              key={formKey}
              titel="Nieuwe functie"
              actie={createFunctie}
              onDone={() => setNieuwOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Functie</TableHead>
                <TableHead>Uurtarief</TableHead>
                <TableHead>Gebruikers</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {functies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Er zijn nog geen functies. Maak er een aan met “Nieuwe functie”.
                  </TableCell>
                </TableRow>
              ) : (
                functies.map((f) => <FunctieTabelRij key={f.id} functie={f} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FunctieTabelRij({ functie }: { functie: FunctieRij }) {
  const [open, setOpen] = useState(false);

  return (
    <TableRow>
      <TableCell className="font-medium">{functie.naam}</TableCell>
      <TableCell className="tabular-figures">
        {functie.uurtarief !== null ? euroFormat.format(functie.uurtarief) : "—"}
      </TableCell>
      <TableCell className="tabular-figures">{functie.aantalGebruikers}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <VerwijderFunctieDialog functie={functie} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Pencil className="h-4 w-4" />
              Bewerken
            </DialogTrigger>
            <DialogContent>
              <FunctieDialogBody
                titel={functie.naam}
                functie={functie}
                actie={(prev, formData) => updateFunctie(functie.id, prev, formData)}
                onDone={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function FunctieDialogBody({
  titel,
  functie,
  actie,
  onDone,
}: {
  titel: string;
  functie?: FunctieRij;
  actie: (prev: FunctieFormState, formData: FormData) => Promise<FunctieFormState>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: FunctieFormState, formData: FormData) => {
    const result = await actie(prev, formData);
    if (result.success) onDone();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{titel}</DialogTitle>
        <DialogDescription>
          {functie
            ? "Pas de naam of het uurtarief aan. Een nieuw tarief geldt vanaf vandaag."
            : "Een functie met het uurtarief dat Chronos voorstelt bij een nieuw factuuritem."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="functie_naam">Naam</Label>
        <Input id="functie_naam" name="naam" defaultValue={functie?.naam ?? ""} maxLength={80} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="functie_uurtarief">Uurtarief</Label>
        <div className="relative w-40">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
          <Input
            id="functie_uurtarief"
            name="uurtarief"
            type="number"
            step="0.01"
            min="0"
            max="10000"
            className="pl-7"
            defaultValue={functie?.uurtarief ?? ""}
            required
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
          {pending ? "Bezig…" : "Opslaan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function VerwijderFunctieDialog({ functie }: { functie: FunctieRij }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function bevestig() {
    setError(null);
    startTransition(async () => {
      const result = await deleteFunctie(functie.id);
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
      <DialogTrigger render={<Button size="icon-sm" variant="outline" aria-label={`${functie.naam} verwijderen`} />}>
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{functie.naam} verwijderen?</DialogTitle>
          <DialogDescription>
            Het tarief van deze functie verdwijnt ook. Bestaande factuuritems houden hun eigen tarief. Een functie die
            nog aan gebruikers gekoppeld is, kan niet worden verwijderd.
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
