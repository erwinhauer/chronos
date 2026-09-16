"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Valt terug op een tijdelijk textarea-element + execCommand zodra de
// Clipboard-API niet beschikbaar/toegestaan is (bv. een strikt permissions-
// policy of een oudere browser) — anders komt de gebruiker nergens.
function kopieerMetFallback(tekst: string) {
  const textarea = document.createElement("textarea");
  textarea.value = tekst;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const gelukt = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!gelukt) throw new Error("Kopiëren is mislukt.");
}

export function KopieerDossiernummersKnop({ dossiernummers }: { dossiernummers: string[] }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function kopieren() {
    const tekst = dossiernummers.join("; ");
    try {
      await navigator.clipboard.writeText(tekst);
    } catch {
      try {
        kopieerMetFallback(tekst);
      } catch {
        setFout("Kopiëren is mislukt.");
        return;
      }
    }
    setFout(null);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  if (dossiernummers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={kopieren}>
        {gekopieerd ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {gekopieerd ? "Gekopieerd" : "Kopieer dossiernummers"}
      </Button>
      {fout && <p className="text-xs text-destructive">{fout}</p>}
    </div>
  );
}
