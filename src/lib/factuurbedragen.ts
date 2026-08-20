import type { FactuurItemStatus } from "@/lib/supabase/types";

export const STATUS_LABEL: Record<FactuurItemStatus, string> = {
  aangemaakt: "Aangemaakt",
  definitief: "Definitief",
};

export const STATUS_VARIANT: Record<FactuurItemStatus, "secondary" | "success"> = {
  aangemaakt: "secondary",
  definitief: "success",
};

export function regelbedrag(item: { honorarium: number; externe_kosten: number; korting: number }) {
  return item.honorarium + item.externe_kosten - item.korting;
}

export function isNogTeFactureren(status: FactuurItemStatus, declarabel: boolean) {
  return declarabel && status === "aangemaakt";
}

export function isGefactureerd(status: FactuurItemStatus) {
  return status === "definitief";
}

export function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type FactuurRegelVoorTotalen = {
  honorarium: number;
  externe_kosten: number;
  korting: number;
  kantoorkosten_van_toepassing: boolean;
};

// Gedeeld tussen de factureer-actie (autoritatief, bij aanmaken) en het
// voorbeeldscherm (dezelfde cijfers, nog vóór er iets is opgeslagen).
export function berekenFactuurtotalen(items: FactuurRegelVoorTotalen[], kantoorkostenPercentage: number) {
  const totaalHonorarium = round2(items.reduce((som, i) => som + i.honorarium, 0));
  const totaalExterneKosten = round2(items.reduce((som, i) => som + i.externe_kosten, 0));
  const totaalKorting = round2(items.reduce((som, i) => som + i.korting, 0));
  const kantoorkostenGrondslag = round2(
    items.reduce(
      (som, i) => som + (i.kantoorkosten_van_toepassing ? i.honorarium + i.externe_kosten - i.korting : 0),
      0
    )
  );
  const ruweKantoorkosten = round2(kantoorkostenGrondslag * (kantoorkostenPercentage / 100));
  // Minimaal €15, maximaal €200 per factuur — maar geen vloer als er niets van
  // toepassing is (dan blijft het gewoon €0).
  const totaalKantoorkosten = ruweKantoorkosten > 0 ? Math.min(Math.max(ruweKantoorkosten, 15), 200) : 0;
  const subtotaalVoorExtraKorting = round2(
    totaalHonorarium + totaalExterneKosten - totaalKorting + totaalKantoorkosten
  );
  return { totaalHonorarium, totaalExterneKosten, totaalKorting, totaalKantoorkosten, subtotaalVoorExtraKorting };
}
