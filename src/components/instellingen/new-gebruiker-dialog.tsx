"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createGebruiker, type GebruikerFormState } from "@/actions/admin";
import { suggestInitialen } from "@/lib/initials";
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
import type { UserRole } from "@/lib/supabase/types";

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
  const [roleIds, setRoleIds] = useState<UserRole[]>(["medewerker"]);
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [initialen, setInitialen] = useState("");
  const [initialenHandmatig, setInitialenHandmatig] = useState(false);
  const [state, formAction, pending] = useActionState(createGebruiker, initialState);

  const getoondeInitialen = initialenHandmatig ? initialen : suggestInitialen(`${voornaam} ${achternaam}`.trim());

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Gebruiker aangemaakt</DialogTitle>
          <DialogDescription>
            {state.email} kan direct inloggen via een magic link op het loginscherm — een wachtwoord is niet nodig.
          </DialogDescription>
        </DialogHeader>
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
        <DialogDescription>Er wordt direct een account aangemaakt. Inloggen gaat via magic link.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="voornaam">Voornaam</Label>
          <Input id="voornaam" name="voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="achternaam">Achternaam</Label>
          <Input
            id="achternaam"
            name="achternaam"
            value={achternaam}
            onChange={(e) => setAchternaam(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mailadres</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="initialen">Initialen</Label>
          <Input
            id="initialen"
            name="initialen"
            className="w-20 uppercase"
            maxLength={3}
            value={getoondeInitialen}
            onChange={(e) => {
              setInitialenHandmatig(true);
              setInitialen(e.target.value.toUpperCase().slice(0, 3));
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Rollen</Label>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={roleIds.includes(value as UserRole)}
                onCheckedChange={(checked) =>
                  setRoleIds((prev) =>
                    checked === true
                      ? [...prev, value as UserRole]
                      : prev.filter((role) => role !== (value as UserRole))
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
        {roleIds.map((role) => (
          <input key={role} type="hidden" name="role_ids" value={role} />
        ))}
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
