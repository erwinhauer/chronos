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

// valuta is optioneel (default EUR) — bedragen die aan één specifieke klant
// gebonden zijn (bv. een factuuritem-formulier of -tabel) geven de klant se
// eigen valuta door; bedrijfsbrede/meerdere-klanten-overzichten (dashboard)
// blijven ongewijzigd in EUR, want die tellen over klanten met verschillende
// valuta's heen op.
export function euro(n: number, valuta: string = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(n);
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

export function berekenBtw(totaalBedrag: number, btwPercentage: number) {
  return round2(totaalBedrag * (btwPercentage / 100));
}

// Tijdelijke placeholder tot Finance een echte netto-omzet per regel kan afleiden in Chronos.
export const NETTO_OMZET_PLACEHOLDER_RATIO = 0.67;
export function nettoOmzetPlaceholder(bruto: number) {
  return round2(bruto * NETTO_OMZET_PLACEHOLDER_RATIO);
}
