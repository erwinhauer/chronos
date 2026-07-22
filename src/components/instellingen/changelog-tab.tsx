"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createChangelogEntry, type ChangelogFormState } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Entry = {
  id: string;
  versienummer: string;
  releasedatum: string;
  titel: string;
  nieuwe_functies: string[];
  wijzigingen: string[];
  bugfixes: string[];
  bekende_beperkingen: string[];
  gebruikersactie: string | null;
};

export function ChangelogTab({ entries }: { entries: Entry[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Changelog van software-releases, met versienummer (semver).</p>
        <NewChangelogDialog />
      </div>
      <div className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nog geen changelog-entries.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="text-base">{entry.titel}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    v{entry.versienummer}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.releasedatum).toLocaleDateString("nl-NL")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <ChangelogLijst titel="Nieuwe functies" items={entry.nieuwe_functies} />
                <ChangelogLijst titel="Wijzigingen" items={entry.wijzigingen} />
                <ChangelogLijst titel="Bugfixes" items={entry.bugfixes} />
                <ChangelogLijst titel="Bekende beperkingen" items={entry.bekende_beperkingen} />
                {entry.gebruikersactie && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Actie vereist: </span>
                    {entry.gebruikersactie}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function ChangelogLijst({ titel, items }: { titel: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium">{titel}</p>
      <ul className="list-inside list-disc text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const initialState: ChangelogFormState = { error: null, success: false };

function NewChangelogDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ChangelogFormState, formData: FormData) => {
    const result = await createChangelogEntry(prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Nieuwe entry
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nieuwe changelog-entry</DialogTitle>
            <DialogDescription>Versienummer volgens semver: MAJOR.MINOR.PATCH (bv. 1.2.0).</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="versienummer">Versienummer</Label>
              <Input id="versienummer" name="versienummer" placeholder="1.2.0" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="releasedatum">Releasedatum</Label>
              <Input id="releasedatum" name="releasedatum" type="date" required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titel">Titel</Label>
            <Input id="titel" name="titel" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nieuwe_functies">Nieuwe functies (één per regel)</Label>
            <Textarea id="nieuwe_functies" name="nieuwe_functies" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wijzigingen">Wijzigingen (één per regel)</Label>
            <Textarea id="wijzigingen" name="wijzigingen" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bugfixes">Bugfixes (één per regel)</Label>
            <Textarea id="bugfixes" name="bugfixes" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bekende_beperkingen">Bekende beperkingen (één per regel)</Label>
            <Textarea id="bekende_beperkingen" name="bekende_beperkingen" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gebruikersactie">Actie vereist van gebruiker (optioneel)</Label>
            <Textarea id="gebruikersactie" name="gebruikersactie" rows={2} />
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
              {pending ? "Bezig…" : "Entry aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
