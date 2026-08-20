"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { verstuurFactuur } from "@/actions/factuur-verzending";
import { Button } from "@/components/ui/button";

export function VerstuurOpnieuwKnop({ batchId }: { batchId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const resultaat = await verstuurFactuur(batchId);
            if (!resultaat.success) setError(resultaat.error);
          });
        }}
      >
        <RotateCw className="h-4 w-4" />
        {pending ? "Bezig…" : "Opnieuw versturen"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
