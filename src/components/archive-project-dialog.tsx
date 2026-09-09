"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deactiveerProject } from "@/actions/projecten";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type State = { error: string | null };
const initialState: State = { error: null };

export function ArchiveProjectDialog({ projectId, projectNaam }: { projectId: string; projectNaam: string }) {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- vereist door useActionState's reducer-signatuur
  const [state, formAction, pending] = useActionState(async (_prevState: State) => {
    const result = await deactiveerProject(projectId);
    if (result.success) setOpen(false);
    return { error: result.error };
  }, initialState);

  return (
    <>
      <Button size="icon-sm" variant="ghost" type="button" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Project archiveren</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Project archiveren?</DialogTitle>
              <DialogDescription>
                &quot;{projectNaam}&quot; verdwijnt uit de keuzelijst bij het aanmaken van nieuwe factuuritems.
                Bestaande factuuritems op dit project blijven gewoon bewaard, met hun projectnaam en PO-nummer
                zichtbaar.
              </DialogDescription>
            </DialogHeader>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Bezig…" : "Archiveren"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
