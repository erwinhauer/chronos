"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { NewKlantDialog } from "@/components/new-klant-dialog";
import type { NieuweKlant } from "@/actions/klanten";
import { Input } from "@/components/ui/input";

type Klant = { id: string; naam: string };

export function KlantCombobox({
  klanten,
  value,
  onChange,
  onKlantAangemaakt,
}: {
  klanten: Klant[];
  value: string;
  onChange: (klantId: string) => void;
  onKlantAangemaakt: (klant: NieuweKlant) => void;
}) {
  const [invoer, setInvoer] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const geselecteerd = klanten.find((k) => k.id === value);

  const matches = useMemo(() => {
    const q = invoer.trim().toLowerCase();
    if (!q) return klanten.slice(0, 8);
    return klanten.filter((k) => k.naam.toLowerCase().includes(q)).slice(0, 8);
  }, [klanten, invoer]);

  function kiesKlant(klant: Klant) {
    onChange(klant.id);
    setInvoer("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={open ? invoer : geselecteerd?.naam ?? ""}
          onChange={(e) => {
            setInvoer(e.target.value);
            if (value) onChange("");
          }}
          onFocus={() => {
            setInvoer("");
            setOpen(true);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setInvoer("");
            }, 150)
          }
          placeholder="Typ om een klant te zoeken…"
          className="pl-8"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-md">
          {matches.length > 0 ? (
            <div className="flex flex-col">
              {matches.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => kiesKlant(k)}
                  className="rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {k.naam}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">Geen klanten gevonden.</p>
          )}
          <div className="mt-1 border-t border-border pt-1" onMouseDown={(e) => e.preventDefault()}>
            <NewKlantDialog
              initialNaam={invoer.trim()}
              onCreated={(klant) => {
                onKlantAangemaakt(klant);
                onChange(klant.id);
                setInvoer("");
                setOpen(false);
              }}
              trigger={
                <>
                  <Plus className="h-4 w-4" />
                  Nieuwe klant aanmaken{invoer.trim() ? ` "${invoer.trim()}"` : ""}
                </>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
