import type { FactuurItemStatus } from "@/lib/supabase/types";

// Alles wat nog niet is ge(ex)porteerd naar de boekhouding staat nog "in de pijplijn".
const AL_GEFACTUREERD: FactuurItemStatus[] = ["geexporteerd", "gefactureerd"];

export function regelbedrag(item: { honorarium: number; externe_kosten: number; korting: number }) {
  return item.honorarium + item.externe_kosten - item.korting;
}

export function isNogTeFactureren(status: FactuurItemStatus, declarabel: boolean) {
  return declarabel && !AL_GEFACTUREERD.includes(status);
}

export function isGefactureerd(status: FactuurItemStatus) {
  return status === "gefactureerd";
}

export function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}
