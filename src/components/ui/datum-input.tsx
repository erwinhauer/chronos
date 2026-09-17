"use client";

import { useId, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Een native <input type="date"> rendert zijn eigen tekst in de datum-notatie
// van de OS/browser-taalinstelling van de gebruiker (bv. mm/dd/jjjj bij een
// Engelse Windows-instelling) — dat is niet met CSS of een attribuut af te
// dwingen. Dit veld toont daarom altijd zelf dd-mm-jjjj, onafhankelijk van die
// instelling; onderliggend blijft de waarde een ISO-string (yyyy-mm-dd), zoals
// de rest van de app verwacht. Het kalender-icoontje opent de vertrouwde
// native datepicker (via een onzichtbare input + showPicker()) voor wie liever
// klikt dan typt.
type DatumInputProps = {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
};

function isoNaarWeergave(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function maskeerInvoer(ruw: string): string {
  const cijfers = ruw.replace(/\D/g, "").slice(0, 8);
  return [cijfers.slice(0, 2), cijfers.slice(2, 4), cijfers.slice(4, 8)].filter(Boolean).join("-");
}

function weergaveNaarIso(weergave: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(weergave);
  if (!m) return null;
  const dag = Number(m[1]);
  const maand = Number(m[2]);
  const jaar = Number(m[3]);
  const test = new Date(jaar, maand - 1, dag);
  if (test.getFullYear() !== jaar || test.getMonth() !== maand - 1 || test.getDate() !== dag) return null;
  return `${jaar}-${m[2]}-${m[1]}`;
}

export function DatumInput({ id, value, onChange, required, className }: DatumInputProps) {
  const [tekst, setTekst] = useState(isoNaarWeergave(value));
  const nativeRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className={cn("relative", className)}>
      <Input
        id={inputId}
        type="text"
        inputMode="numeric"
        placeholder="dd-mm-jjjj"
        value={tekst}
        onChange={(e) => {
          const gemaskeerd = maskeerInvoer(e.target.value);
          setTekst(gemaskeerd);
          const iso = weergaveNaarIso(gemaskeerd);
          if (iso) onChange(iso);
        }}
        onBlur={() => setTekst(isoNaarWeergave(value))}
        required={required}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => nativeRef.current?.showPicker?.()}
        tabIndex={-1}
        aria-label="Kies datum in kalender"
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTekst(isoNaarWeergave(e.target.value));
        }}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
