"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { parseDossiernummer, landNaamVoorIso, DOSSIERNUMMER_VOORBEELD } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DossiernummerTagInput({
  value,
  onChange,
  landen,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  landen?: LandenMap;
}) {
  const [invoer, setInvoer] = useState("");

  function toevoegen() {
    const nummer = invoer.trim().toUpperCase();
    if (!nummer || value.includes(nummer)) {
      setInvoer("");
      return;
    }
    onChange([...value, nummer]);
    setInvoer("");
  }

  function verwijderen(nummer: string) {
    onChange(value.filter((d) => d !== nummer));
  }

  const preview = parseDossiernummer(invoer);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="dossiernummer_input">Dossier(s)</Label>
      <div className="flex gap-2">
        <Input
          id="dossiernummer_input"
          value={invoer}
          onChange={(e) => setInvoer(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              toevoegen();
            }
          }}
          placeholder={DOSSIERNUMMER_VOORBEELD}
        />
        <Button type="button" variant="outline" size="icon" onClick={toevoegen} aria-label="Dossier toevoegen">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {invoer && (
        <p className="text-xs text-muted-foreground">
          {preview ? `${preview.typeLabel} · ${landNaamVoorIso(preview.landIso, landen)}` : "Onbekend dossiernummerformaat"}
        </p>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-sm"
            >
              {d}
              <button
                type="button"
                onClick={() => verwijderen(d)}
                aria-label={`${d} verwijderen`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
