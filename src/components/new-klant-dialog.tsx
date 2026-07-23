"use client";

import { useActionState, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { createKlant, type KlantFormState } from "@/actions/klanten";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const initialState: KlantFormState = { error: null, success: false };

export function NewKlantDialog() {
  const [open, setOpen] = useState(false);
  const [kantoorkostenActief, setKantoorkostenActief] = useState(true);
  const [state, formAction, pending] = useActionState(async (prev: KlantFormState, formData: FormData) => {
    const result = await createKlant(prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Nieuwe klant
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nieuwe klant aanmaken</DialogTitle>
            <DialogDescription>Klantgegevens en specificatie-instellingen.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="naam">Klantnaam</Label>
              <Input id="naam" name="naam" placeholder="Bijv. Arcadis" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subtitel">Subtitel (optioneel)</Label>
              <Input id="subtitel" name="subtitel" placeholder="Korte omschrijving of alias" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactpersoon_naam">Contactpersoon</Label>
              <Input id="contactpersoon_naam" name="contactpersoon_naam" placeholder="Naam" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact_email">E-mailadres</Label>
              <Input id="contact_email" name="contact_email" type="email" placeholder="naam@klant.nl" required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="specificatietaal">Taal factuur/specificatie</Label>
            <div className="relative">
              <select
                id="specificatietaal"
                name="specificatietaal"
                defaultValue="nl"
                className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              >
                <option value="nl">Nederlands</option>
                <option value="en">Engels</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={kantoorkostenActief}
              onCheckedChange={(checked) => setKantoorkostenActief(checked === true)}
            />
            <input type="hidden" name="kantoorkosten_actief" value={kantoorkostenActief ? "on" : ""} />
            Kantoorkosten (6%) van toepassing bij deze klant
          </label>

          <div className="flex flex-col gap-2">
            <Label htmlFor="opmerkingen">Opmerkingen (optioneel, intern)</Label>
            <Textarea id="opmerkingen" name="opmerkingen" rows={3} placeholder="Alleen intern zichtbaar." />
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
              {pending ? "Bezig met aanmaken…" : "Klant aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
