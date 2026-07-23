"use client";

import { useActionState, useState } from "react";
import { FolderInput } from "lucide-react";
import { moveFactuuritemsToProject, type VerplaatsFormState } from "@/actions/factuuritems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Project = { id: string; naam: string; po_nummer: string | null };

const initialState: VerplaatsFormState = { error: null, success: false };

export function VerplaatsProjectDialog({
  klantId,
  itemIds,
  projecten,
  huidigProjectId,
}: {
  klantId: string;
  itemIds: string[];
  projecten: Project[];
  huidigProjectId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: VerplaatsFormState, formData: FormData) => {
    const result = await moveFactuuritemsToProject(klantId, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  const opties = projecten.filter((p) => p.id !== huidigProjectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={itemIds.length === 0} />}>
        <FolderInput className="h-4 w-4" />
        Verplaats naar project ({itemIds.length})
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Verplaatsen naar project</DialogTitle>
            <DialogDescription>
              {itemIds.length} factuuritem{itemIds.length === 1 ? "" : "s"} koppelen aan een ander project.
            </DialogDescription>
          </DialogHeader>

          {itemIds.map((id) => (
            <input key={id} type="hidden" name="item_ids" value={id} />
          ))}

          <div className="flex flex-col gap-2">
            <label htmlFor="project_id" className="text-sm font-medium">
              Project
            </label>
            <select
              id="project_id"
              name="project_id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              <option value="">Geen project</option>
              {opties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.naam}
                  {p.po_nummer ? ` (${p.po_nummer})` : ""}
                </option>
              ))}
            </select>
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
              {pending ? "Bezig…" : "Verplaatsen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
