"use client";

import { useActionState } from "react";
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

// Volledig van buitenaf bestuurd (open = itemId !== null) zodat dit ook vanuit
// een kebab-menu getriggerd kan worden zonder de bekende race tussen het
// sluiten van het menu en het openen van de dialoog.
export function VerwijderFactuurItemDialog({
  itemId,
  onOpenChange,
}: {
  itemId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- vereist door useActionState's reducer-signatuur
  const [state, formAction, pending] = useActionState(async (_prevState: State) => {
    if (!itemId) return initialState;
    const result = await deleteFactuurItem(itemId);
    if (!result.error) onOpenChange(false);
    return result;
  }, initialState);

  return (
    <Dialog open={itemId !== null} onOpenChange={onOpenChange}>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
