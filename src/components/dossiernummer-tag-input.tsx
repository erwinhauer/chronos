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
  onToevoegen,
  landen,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  // Async validatie/koppeling tegen Patricia (bestaat het dossier? zelfde
  // klant als de al toegevoegde dossiers?) — geeft `null` terug bij succes
  // (de aanroeper heeft dan zelf al de state bijgewerkt) of een foutmelding
  // om te tonen. Toevoegen gebeurt hier dus niet meer zelf via `onChange`.
  onToevoegen: (nummer: string) => Promise<string | null>;
  landen?: LandenMap;
}) {
  const [invoer, setInvoer] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  // Meerdere dossiers mogen op één factuuritem, maar alleen van hetzelfde
  // type (TM, O, I, A, etc.) én hetzelfde land — anders is achteraf niet
  // meer te meten hoeveel omzet er per dossiertype/land is geschreven, en
  // zou de (nu vaste, Patricia-bepaalde) klant niet eenduidig zijn.
  const eersteGeparsed = value.map((d) => parseDossiernummer(d)).find((p) => p !== null);
  const bestaandType = eersteGeparsed
    ? { code: eersteGeparsed.typeCode, label: eersteGeparsed.typeLabel, landIso: eersteGeparsed.landIso }
    : null;

  async function toevoegen() {
    const nummer = invoer.trim().toUpperCase();
    if (!nummer || value.includes(nummer)) {
      setInvoer("");
      setFout(null);
      return;
    }
    const parsed = parseDossiernummer(nummer);
    if (!parsed) {
      setFout("Onbekend dossiernummerformaat.");
      return;
    }
    if (bestaandType && (parsed.typeCode !== bestaandType.code || parsed.landIso !== bestaandType.landIso)) {
      setFout(
        `${parsed.typeLabel} · ${landNaamVoorIso(parsed.landIso, landen)} kan niet samen met ${bestaandType.label} · ${landNaamVoorIso(bestaandType.landIso, landen)} op één factuuritem — combineer alleen dossiers van hetzelfde type én land.`
      );
      return;
    }
    setFout(null);
    setBezig(true);
    const foutmelding = await onToevoegen(nummer);
    setBezig(false);
    if (foutmelding) {
      setFout(foutmelding);
      return;
    }
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
          disabled={bezig}
          placeholder="Typ het dossiernummer en klik op Enter, of klik op het plusje"
        />
        <Button type="button" variant="outline" size="icon" onClick={toevoegen} disabled={bezig} aria-label="Dossier toevoegen">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {bezig && <p className="text-xs text-muted-foreground">Controleren in Patricia…</p>}
      {!bezig && invoer && (
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
