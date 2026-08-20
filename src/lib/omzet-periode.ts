// Periode-filter voor de bruto-/uren-omzet-uitsplitsingen op het dashboard.
// Los van de YTD-vs-jaardoel-berekening (die blijft altijd het volledige
// lopende jaar tot vandaag, ongeacht deze filter — zie dashboard/page.tsx).

export type Periode =
  | { type: "ytd" }
  | { type: "jaar" }
  | { type: "maand"; maand: number } // 0-11
  | { type: "kwartaal"; kwartaal: number } // 1-4
  | { type: "halfjaar"; helft: 1 | 2 };

const PERIODE_LABELS: Record<string, string> = {
  ytd: "Dit jaar (YTD)",
  jaar: "Heel jaar",
  "maand-0": "Januari",
  "maand-1": "Februari",
  "maand-2": "Maart",
  "maand-3": "April",
  "maand-4": "Mei",
  "maand-5": "Juni",
  "maand-6": "Juli",
  "maand-7": "Augustus",
  "maand-8": "September",
  "maand-9": "Oktober",
  "maand-10": "November",
  "maand-11": "December",
  "kwartaal-1": "Q1",
  "kwartaal-2": "Q2",
  "kwartaal-3": "Q3",
  "kwartaal-4": "Q4",
  "halfjaar-1": "H1",
  "halfjaar-2": "H2",
};

export function periodeKey(periode: Periode): string {
  if (periode.type === "ytd") return "ytd";
  if (periode.type === "jaar") return "jaar";
  if (periode.type === "maand") return `maand-${periode.maand}`;
  if (periode.type === "kwartaal") return `kwartaal-${periode.kwartaal}`;
  return `halfjaar-${periode.helft}`;
}

export function periodeLabel(periode: Periode): string {
  return PERIODE_LABELS[periodeKey(periode)] ?? "Dit jaar (YTD)";
}

export function parsePeriodeKey(key: string | undefined): Periode {
  if (!key || key === "ytd") return { type: "ytd" };
  if (key === "jaar") return { type: "jaar" };
  const [type, waarde] = key.split("-");
  const nummer = Number(waarde);
  if (type === "maand" && nummer >= 0 && nummer <= 11) return { type: "maand", maand: nummer };
  if (type === "kwartaal" && nummer >= 1 && nummer <= 4) return { type: "kwartaal", kwartaal: nummer };
  if (type === "halfjaar" && (nummer === 1 || nummer === 2)) return { type: "halfjaar", helft: nummer };
  return { type: "ytd" };
}

export const ALLE_PERIODES: Periode[] = [
  { type: "ytd" },
  { type: "jaar" },
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((maand): Periode => ({ type: "maand", maand })),
  ...[1, 2, 3, 4].map((kwartaal): Periode => ({ type: "kwartaal", kwartaal })),
  { type: "halfjaar", helft: 1 },
  { type: "halfjaar", helft: 2 },
];

// Datumgrens (exclusief eind) voor een periode binnen een specifiek jaar. "ytd"
// loopt tot en met vandaag; de overige periodes zijn een vaste kalendergrens.
function periodeRange(periode: Periode, jaar: number): { start: Date; eind: Date } {
  if (periode.type === "ytd") {
    return { start: new Date(jaar, 0, 1), eind: new Date() };
  }
  if (periode.type === "jaar") {
    return { start: new Date(jaar, 0, 1), eind: new Date(jaar + 1, 0, 1) };
  }
  if (periode.type === "maand") {
    return { start: new Date(jaar, periode.maand, 1), eind: new Date(jaar, periode.maand + 1, 1) };
  }
  if (periode.type === "kwartaal") {
    const startMaand = (periode.kwartaal - 1) * 3;
    return { start: new Date(jaar, startMaand, 1), eind: new Date(jaar, startMaand + 3, 1) };
  }
  const startMaand = periode.helft === 1 ? 0 : 6;
  return { start: new Date(jaar, startMaand, 1), eind: new Date(jaar, startMaand + 6, 1) };
}

export function inPeriode(datum: string, periode: Periode, jaar: number): boolean {
  const { start, eind } = periodeRange(periode, jaar);
  const d = new Date(datum);
  return d >= start && d < eind;
}
