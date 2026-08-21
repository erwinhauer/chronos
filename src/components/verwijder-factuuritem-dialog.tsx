"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteFactuurItem } from "@/actions/factuuritems";
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

export function VerwijderFactuurItemDialog({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- vereist door useActionState's reducer-signatuur
  const [state, formAction, pending] = useActionState(async (_prevState: State) => {
    const result = await deleteFactuurItem(itemId);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="icon-sm" variant="outline" aria-label="Verwijderen" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
            <DialogDescription>
              Dit factuuritem wordt definitief verwijderd. Dit kan niet ongedaan worden gemaakt.
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
              {pending ? "Bezig…" : "Verwijderen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
