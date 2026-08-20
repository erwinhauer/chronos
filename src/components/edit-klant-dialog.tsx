"use client";

import { useActionState, useState } from "react";
import { Pencil, ChevronDown } from "lucide-react";
import { updateKlant, type KlantFormState } from "@/actions/klanten";
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

type Klant = {
  id: string;
  naam: string;
  subtitel: string | null;
  contactpersoon_naam: string | null;
  contact_email: string | null;
  specificatietaal: "nl" | "en";
  kantoorkosten_actief: boolean;
  kolom_externe_kosten_zichtbaar: boolean;
  opmerkingen: string | null;
};

const initialState: KlantFormState = { error: null, success: false };

export function EditKlantDialog({ klant }: { klant: Klant }) {
  const [open, setOpen] = useState(false);
  const [kantoorkostenActief, setKantoorkostenActief] = useState(klant.kantoorkosten_actief);
  const [kostenDerdenApart, setKostenDerdenApart] = useState(klant.kolom_externe_kosten_zichtbaar);
  const [state, formAction, pending] = useActionState(async (prev: KlantFormState, formData: FormData) => {
    const result = await updateKlant(klant.id, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="h-4 w-4" />
        Bewerken
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Klant bewerken</DialogTitle>
            <DialogDescription>Klantgegevens en specificatie-instellingen.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="naam">Klantnaam</Label>
              <Input id="naam" name="naam" defaultValue={klant.naam} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subtitel">Subtitel (optioneel)</Label>
              <Input id="subtitel" name="subtitel" defaultValue={klant.subtitel ?? ""} placeholder="Korte omschrijving of alias" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactpersoon_naam">Contactpersoon</Label>
              <Input
                id="contactpersoon_naam"
                name="contactpersoon_naam"
                defaultValue={klant.contactpersoon_naam ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact_email">E-mailadres</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={klant.contact_email ?? ""}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="specificatietaal">Taal factuur/specificatie</Label>
            <div className="relative">
              <select
                id="specificatietaal"
                name="specificatietaal"
                defaultValue={klant.specificatietaal}
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

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={kostenDerdenApart}
              onCheckedChange={(checked) => setKostenDerdenApart(checked === true)}
            />
            <input type="hidden" name="kolom_externe_kosten_zichtbaar" value={kostenDerdenApart ? "on" : ""} />
            Kosten van derden apart tonen op de specificatie
          </label>

          <div className="flex flex-col gap-2">
            <Label htmlFor="opmerkingen">Opmerkingen (optioneel, intern)</Label>
            <Textarea
              id="opmerkingen"
              name="opmerkingen"
              rows={3}
              defaultValue={klant.opmerkingen ?? ""}
              placeholder="Alleen intern zichtbaar."
            />
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
              {pending ? "Bezig met opslaan…" : "Wijzigingen opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
