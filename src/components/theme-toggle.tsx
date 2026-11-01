"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "chronos-theme";

// Licht/donker-schakelaar (zon/maan-pill). De keuze staat in localStorage; een
// klein inline-script in de root layout zet de `dark`-klasse vóór de eerste
// paint, zodat er geen lichte flits is bij een donkere voorkeur.
export function ThemeToggle({ className }: { className?: string }) {
  const [donker, setDonker] = useState(false);

  useEffect(() => {
    // Pas na mount de echte stand uitlezen, zodat server- en clientrender gelijk blijven.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDonker(document.documentElement.classList.contains("dark"));
  }, []);

  function zet(waarde: boolean) {
    setDonker(waarde);
    document.documentElement.classList.toggle("dark", waarde);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, waarde ? "dark" : "light");
    } catch {
      // Zonder opslag werkt de schakelaar nog steeds voor deze sessie.
    }
  }

  const knop = "flex h-9 w-9 items-center justify-center rounded-full transition-colors";
  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-card p-1", className)} role="group" aria-label="Weergave">
      <button
        type="button"
        onClick={() => zet(false)}
        aria-pressed={!donker}
        aria-label="Licht"
        className={cn(knop, !donker ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        <Sun className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => zet(true)}
        aria-pressed={donker}
        aria-label="Donker"
        className={cn(knop, donker ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:text-foreground")}
      >
        <Moon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
