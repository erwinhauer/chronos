"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { parseDossiernummer } from "@/lib/dossiernummer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PatriciaDossierOptie = { id: string; klant_id: string; dossiernummer: string; matter_naam: string };

export function DossierSelect({
  dossiers,
  value,
  onChange,
  onbekendeDossiers = [],
}: {
  dossiers: PatriciaDossierOptie[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Dossiernummers van een bestaand factuuritem die niet (meer) in de dummy-lijst
   * voorkomen — non-editable getoond zodat historische dossierinfo nooit stilzwijgend verloren gaat. */
  onbekendeDossiers?: { dossiernummer: string; type_dienst: string | null; land: string | null }[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const geselecteerd = useMemo(() => dossiers.filter((d) => value.includes(d.id)), [dossiers, value]);
  const lockedKlantId = geselecteerd[0]?.klant_id ?? null;

  const beschikbaar = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (value.includes(d.id)) return false;
      if (lockedKlantId && d.klant_id !== lockedKlantId) return false;
      if (!q) return true;
      return d.dossiernummer.toLowerCase().includes(q) || d.matter_naam.toLowerCase().includes(q);
    });
  }, [dossiers, value, lockedKlantId, query]);

  function toevoegen(id: string) {
    onChange([...value, id]);
    setQuery("");
  }

  function verwijderen(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="dossier_zoek">Dossier(s)</Label>
      <div className="relative">
        <Input
          id="dossier_zoek"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Zoek op dossiernummer of omschrijving…"
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
            {beschikbaar.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {lockedKlantId ? "Geen andere dossiers gevonden voor deze klant." : "Geen dossiers gevonden."}
              </p>
            ) : (
              beschikbaar.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toevoegen(d.id)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{d.dossiernummer}</span>
                  <span className="text-xs text-muted-foreground">{d.matter_naam}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {lockedKlantId && (
        <p className="text-xs text-muted-foreground">Dossiers van andere klanten worden niet getoond.</p>
      )}
      {onbekendeDossiers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {onbekendeDossiers.map((d) => (
            <span
              key={d.dossiernummer}
              title="Niet (meer) gevonden in de dossierlijst — alleen ter referentie, niet te verwijderen."
              className="inline-flex flex-col gap-0.5 rounded-md border border-dashed border-border bg-muted/50 px-2 py-1 text-sm text-muted-foreground"
            >
              <span className="font-medium">{d.dossiernummer}</span>
              {d.type_dienst && (
                <span className="text-xs">
                  {d.type_dienst}
                  {d.land ? ` · ${d.land}` : ""}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
      {geselecteerd.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {geselecteerd.map((d) => {
            const parsed = parseDossiernummer(d.dossiernummer);
            return (
              <span
                key={d.id}
                className="inline-flex flex-col gap-0.5 rounded-md border border-border bg-muted px-2 py-1 text-sm"
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{d.dossiernummer}</span>
                  <button
                    type="button"
                    onClick={() => verwijderen(d.id)}
                    aria-label={`${d.dossiernummer} verwijderen`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                {parsed && (
                  <span className="text-xs text-muted-foreground">
                    {parsed.typeLabel} · {parsed.landNaam}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
