"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createProject, type NieuwProject, type ProjectFormState } from "@/actions/projecten";
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

export function NewProjectDialog({
  klantId,
  onCreated,
  trigger,
  size = "sm",
  variant = "outline",
}: {
  klantId: string;
  onCreated?: (project: NieuwProject) => void;
  trigger?: React.ReactNode;
  size?: "xs" | "sm";
  variant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ProjectFormState, formData: FormData) => {
    const result = await createProject(klantId, prev, formData);
    if (result.success) {
      setOpen(false);
      if (result.project) onCreated?.(result.project);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} type="button" />}>
        {trigger ?? (
          <>
            <Plus className="h-4 w-4" />
            Nieuw project
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nieuw project aanmaken</DialogTitle>
            <DialogDescription>
              Projecten laten toe om werk voor deze klant apart te factureren, elk met een eigen PO-nummer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="naam">Projectnaam</Label>
            <Input id="naam" name="naam" placeholder="Bijv. Merkenportefeuille EU" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="po_nummer">PO-nummer (optioneel)</Label>
            <Input id="po_nummer" name="po_nummer" placeholder="Bijv. PO-2026-001" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="omschrijving">Omschrijving (optioneel)</Label>
            <Textarea id="omschrijving" name="omschrijving" rows={2} placeholder="Waar dit project over gaat." />
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
              {pending ? "Bezig…" : "Project aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
