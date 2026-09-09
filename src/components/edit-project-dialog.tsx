"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { updateProject, type NieuwProject, type ProjectFormState } from "@/actions/projecten";
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

const initialState: ProjectFormState = { error: null, success: false };

export function EditProjectDialog({
  projectId,
  naam,
  poNummer,
  omschrijving,
  onGewijzigd,
}: {
  projectId: string;
  naam: string;
  poNummer: string | null;
  omschrijving: string | null;
  onGewijzigd?: (project: NieuwProject) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ProjectFormState, formData: FormData) => {
    const result = await updateProject(projectId, prev, formData);
    if (result.success) {
      setOpen(false);
      if (result.project) onGewijzigd?.(result.project);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" type="button" />}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Project bewerken</span>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Project bewerken</DialogTitle>
            <DialogDescription>Wijzig de projectnaam, het PO-nummer of de omschrijving.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-naam">Projectnaam</Label>
            <Input id="edit-naam" name="naam" defaultValue={naam} placeholder="Bijv. Merkenportefeuille EU" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-po_nummer">PO-nummer (optioneel)</Label>
            <Input id="edit-po_nummer" name="po_nummer" defaultValue={poNummer ?? ""} placeholder="Bijv. PO-2026-001" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-omschrijving">Omschrijving (optioneel)</Label>
            <Textarea
              id="edit-omschrijving"
              name="omschrijving"
              rows={2}
              defaultValue={omschrijving ?? ""}
              placeholder="Waar dit project over gaat."
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
              {pending ? "Bezig…" : "Wijzigingen opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
