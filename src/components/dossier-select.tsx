"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PatriciaDossierOptie = { klant_id: string; dossiernummer: string; matter_naam: string | null };

// Komma/puntkomma splitst een geplakte of ingetypte lijst in losse pogingen.
const SPLIT_PATTERN = /[,;]+/;

export function DossierSelect({
  dossiers,
  value,
  onChange,
}: {
  /** Bekende dossiers: actieve suggesties én (voor bewerken) de al aan dit item
   * gekoppelde dossiers, zodat die altijd herleidbaar en verwijderbaar blijven. */
  dossiers: PatriciaDossierOptie[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [nietGevonden, setNietGevonden] = useState<string[]>([]);

  const perNummer = useMemo(() => new Map(dossiers.map((d) => [d.dossiernummer, d])), [dossiers]);
  const geselecteerd = useMemo(() => value.map((d) => ({ dossiernummer: d, optie: perNummer.get(d) ?? null })), [
    value,
    perNummer,
  ]);
  const lockedKlantId = geselecteerd.find((g) => g.optie)?.optie?.klant_id ?? null;

  const beschikbaar = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (value.includes(d.dossiernummer)) return false;
      if (lockedKlantId && d.klant_id !== lockedKlantId) return false;
      if (!q) return true;
      return d.dossiernummer.toLowerCase().includes(q) || (d.matter_naam ?? "").toLowerCase().includes(q);
    });
  }, [dossiers, value, lockedKlantId, query]);

  function toevoegen(dossiernummer: string) {
    if (!value.includes(dossiernummer)) onChange([...value, dossiernummer]);
    setQuery("");
  }

  function verwijderen(dossiernummer: string) {
    onChange(value.filter((v) => v !== dossiernummer));
  }

  function verwerkTekst(tekst: string) {
    const kandidaten = tekst
      .split(SPLIT_PATTERN)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (kandidaten.length === 0) return;

    // Eén onChange-aanroep met het volledige resultaat — niet per kandidaat,
    // anders leest elke aanroep dezelfde (nog niet bijgewerkte) `value` en
    // overschrijft de laatste toevoeging alle eerdere in dezelfde batch.
    const nietGevondenNieuw: string[] = [];
    const nieuweWaarde = [...value];
    for (const kandidaat of kandidaten) {
      const optie = perNummer.get(kandidaat);
      if (optie && (!lockedKlantId || optie.klant_id === lockedKlantId)) {
        if (!nieuweWaarde.includes(kandidaat)) nieuweWaarde.push(kandidaat);
      } else {
        nietGevondenNieuw.push(kandidaat);
      }
    }
    if (nieuweWaarde.length !== value.length) onChange(nieuweWaarde);
    setNietGevonden(nietGevondenNieuw);
    setQuery("");
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
            setNietGevonden([]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === ";") {
              e.preventDefault();
              verwerkTekst(query);
            }
          }}
          onPaste={(e) => {
            const tekst = e.clipboardData.getData("text");
            if (SPLIT_PATTERN.test(tekst)) {
              e.preventDefault();
              verwerkTekst(tekst);
            }
          }}
          placeholder="Zoek of typ een dossiernummer, komma/puntkomma voor meerdere…"
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
                  key={d.dossiernummer}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toevoegen(d.dossiernummer)}
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
      {nietGevonden.length > 0 && (
        <p className="text-xs text-destructive">Niet gevonden: {nietGevonden.join(", ")}</p>
      )}
      {geselecteerd.length > 0 && (
        <div className="flex flex-col gap-2">
          {geselecteerd.map(({ dossiernummer, optie }) => (
            <div
              key={dossiernummer}
              className="flex flex-col gap-0.5 rounded-md border border-border bg-muted px-2.5 py-1.5 text-sm"
            >
              <span className="flex items-center justify-between gap-1.5">
                <span className="font-medium">{dossiernummer}</span>
                <button
                  type="button"
                  onClick={() => verwijderen(dossiernummer)}
                  aria-label={`${dossiernummer} verwijderen`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              <span className="text-xs text-muted-foreground">{optie?.matter_naam ?? "Onbekend dossier"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
