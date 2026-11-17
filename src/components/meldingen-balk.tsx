"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MeldingBlok, type MeldingSoort } from "@/components/melding-blok";
import { sluitMelding } from "@/actions/meldingen";

export type ActieveMelding = {
  id: string;
  soort: MeldingSoort;
  tekst: string;
  wegklikbaar: boolean;
};

// Hoe vaak een open tabblad naar nieuwe meldingen kijkt. Het layout wordt bij navigeren niet opnieuw
// opgehaald, dus zonder dit zie je een melding pas na het herladen van de pagina.
const VERVERS_INTERVAL_MS = 5 * 60 * 1000;

const VOLGORDE: Record<MeldingSoort, number> = { urgent: 0, waarschuwing: 1, info: 2 };

export function MeldingenBalk({ meldingen }: { meldingen: ActieveMelding[] }) {
  const router = useRouter();
  const [gesloten, setGesloten] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, VERVERS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  const zichtbaar = meldingen
    .filter((m) => !gesloten.includes(m.id))
    .sort((a, b) => VOLGORDE[a.soort] - VOLGORDE[b.soort]);

  if (zichtbaar.length === 0) return null;

  return (
    <div className="shrink-0 print:hidden">
      {zichtbaar.map((m) => (
        <MeldingBlok
          key={m.id}
          soort={m.soort}
          tekst={m.tekst}
          onSluit={
            m.wegklikbaar
              ? () => {
                  setGesloten((prev) => [...prev, m.id]);
                  void sluitMelding(m.id);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
