"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MeldingBlok, type MeldingSoort } from "@/components/melding-blok";
import { markeerMeldingenGezien } from "@/actions/meldingen";

export type ActieveMelding = {
  id: string;
  soort: MeldingSoort;
  tekst: string;
  wegklikbaar: boolean;
  verloopt_op: string | null;
};

// Hoe vaak een open tabblad naar nieuwe meldingen kijkt. Het layout wordt bij navigeren niet opnieuw
// opgehaald, dus zonder dit zie je een melding pas na het herladen van de pagina.
const VERVERS_INTERVAL_MS = 5 * 60 * 1000;
// Hoe vaak de balk controleert of een getoonde melding inmiddels is verlopen.
const VERLOOP_CONTROLE_MS = 30 * 1000;

const VOLGORDE: Record<MeldingSoort, number> = { urgent: 0, waarschuwing: 1, info: 2 };

// `meldingen`: wat deze gebruiker nu mag zien (wegklikbare meldingen alleen als hij ze in deze
// inlogsessie nog niet heeft gezien; niet-wegklikbare altijd). `actieveIds`: alle meldingen die nu
// actief en niet verlopen zijn, zodat een uitgezette melding ook uit een open pagina verdwijnt.
export function MeldingenBalk({
  meldingen,
  actieveIds,
}: {
  meldingen: ActieveMelding[];
  actieveIds: string[];
}) {
  const router = useRouter();
  // Wat in deze paginaweergave is getoond. Een melding die de server na het "gezien" markeren niet
  // meer meestuurt, blijft staan tot de pagina opnieuw wordt geladen of de gebruiker hem sluit.
  const [getoond, setGetoond] = useState<ActieveMelding[]>(meldingen);
  const [gesloten, setGesloten] = useState<string[]>([]);
  const [nu, setNu] = useState(() => Date.now());
  const [vorigeMeldingen, setVorigeMeldingen] = useState(meldingen);

  // Render-fase aanpassing: nieuwe of gewijzigde meldingen uit een verversing erbij zetten. Een
  // gewijzigde melding die de gebruiker had gesloten, verschijnt opnieuw.
  if (meldingen !== vorigeMeldingen) {
    setVorigeMeldingen(meldingen);
    const gewijzigd = meldingen
      .filter((m) => {
        const oud = getoond.find((g) => g.id === m.id);
        return oud && (oud.tekst !== m.tekst || oud.soort !== m.soort);
      })
      .map((m) => m.id);
    setGetoond([...getoond.filter((g) => !meldingen.some((m) => m.id === g.id)), ...meldingen]);
    if (gewijzigd.length > 0) setGesloten(gesloten.filter((id) => !gewijzigd.includes(id)));
  }

  useEffect(() => {
    const ids = meldingen.filter((m) => m.wegklikbaar).map((m) => m.id);
    if (ids.length > 0) void markeerMeldingenGezien(ids);
  }, [meldingen]);

  useEffect(() => {
    const verversen = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, VERVERS_INTERVAL_MS);
    const verloop = setInterval(() => setNu(Date.now()), VERLOOP_CONTROLE_MS);
    return () => {
      clearInterval(verversen);
      clearInterval(verloop);
    };
  }, [router]);

  const zichtbaar = getoond
    .filter(
      (m) =>
        actieveIds.includes(m.id) &&
        !gesloten.includes(m.id) &&
        (!m.verloopt_op || new Date(m.verloopt_op).getTime() > nu)
    )
    .sort((a, b) => VOLGORDE[a.soort] - VOLGORDE[b.soort]);

  if (zichtbaar.length === 0) return null;

  return (
    <div className="shrink-0 print:hidden">
      {zichtbaar.map((m) => (
        <MeldingBlok
          key={m.id}
          soort={m.soort}
          tekst={m.tekst}
          onSluit={m.wegklikbaar ? () => setGesloten((prev) => [...prev, m.id]) : undefined}
        />
      ))}
    </div>
  );
}
