"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { parseDossiernummer, landNaamVoorIso } from "@/lib/dossiernummer";
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
  const [fout, setFout] = useState<string | null>(null);

  // Meerdere dossiers mogen op één factuuritem, maar alleen van hetzelfde
  // type (TM, O, I, A, etc.) — anders is achteraf niet meer te meten hoeveel
  // omzet er per dossiertype is geschreven. Land mag wel verschillen.
  const eersteGeparsed = value.map((d) => parseDossiernummer(d)).find((p) => p !== null);
  const bestaandType = eersteGeparsed ? { code: eersteGeparsed.typeCode, label: eersteGeparsed.typeLabel } : null;

  function toevoegen() {
    const nummer = invoer.trim().toUpperCase();
    if (!nummer || value.includes(nummer)) {
      setInvoer("");
      setFout(null);
      return;
    }
    const parsed = parseDossiernummer(nummer);
    if (parsed && bestaandType && parsed.typeCode !== bestaandType.code) {
      setFout(
        `${parsed.typeLabel} kan niet samen met ${bestaandType.label} op één factuuritem — combineer alleen dossiers van hetzelfde type.`
      );
      return;
    }
    setFout(null);
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
          onChange={(e) => {
            setInvoer(e.target.value.toUpperCase());
            setFout(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              toevoegen();
            }
          }}
          placeholder="Typ het dossiernummer en klik op Enter, of klik op het plusje"
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
      {fout && <p className="text-xs font-medium text-destructive">{fout}</p>}
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
