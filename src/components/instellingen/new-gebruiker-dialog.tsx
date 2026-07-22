"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createGebruiker, type GebruikerFormState } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/nav";

const initialState: GebruikerFormState = { error: null, success: false };

export function NewGebruikerDialog({ teams }: { teams: { id: string; naam: string }[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Nieuwe gebruiker
      </DialogTrigger>
      <DialogContent>
        <GebruikerDialogBody key={formKey} teams={teams} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function GebruikerDialogBody({ teams, onDone }: { teams: { id: string; naam: string }[]; onDone: () => void }) {
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(createGebruiker, initialState);

  if (state.success && state.tempWachtwoord) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Gebruiker aangemaakt</DialogTitle>
          <DialogDescription>Geef dit tijdelijke wachtwoord door aan {state.email}.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted p-3 font-mono text-sm">{state.tempWachtwoord}</div>
        <DialogFooter>
          <Button onClick={onDone}>Klaar</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Nieuwe gebruiker aanmaken</DialogTitle>
        <DialogDescription>Er wordt direct een account aangemaakt met een tijdelijk wachtwoord.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Naam</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mailadres</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          name="role"
          defaultValue="medewerker"
          className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Teams</Label>
          <div className="flex flex-wrap gap-3">
            {teams.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={teamIds.includes(t.id)}
                  onCheckedChange={(checked) =>
                    setTeamIds((prev) => (checked === true ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                  }
                />
                {t.naam}
              </label>
            ))}
          </div>
          {teamIds.map((id) => (
            <input key={id} type="hidden" name="team_ids" value={id} />
          ))}
        </div>
      )}

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
          {pending ? "Bezig…" : "Gebruiker aanmaken"}
        </Button>
      </DialogFooter>
    </form>
  );
}
