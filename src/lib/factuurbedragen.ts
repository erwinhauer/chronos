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
