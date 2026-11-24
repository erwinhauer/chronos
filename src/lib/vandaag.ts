// "Vandaag" en toekomstige datums, altijd in Amsterdamse tijd. Een factuuritem met een datum na
// vandaag is "gepland": het telt nog niet mee in onderhanden werk en kan nog niet worden
// gefactureerd. Op de datum zelf is het een gewoon openstaand item, zonder dat er iets hoeft te
// gebeuren. `toISOString()` geeft UTC en kan rond middernacht een dag schelen, vandaar deze helper.

const TIJDZONE = "Europe/Amsterdam";

// "2026-11-24" (jaar-maand-dag) voor het gegeven moment in Amsterdamse tijd.
export function vandaagAmsterdam(nu: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIJDZONE }).format(nu);
}

export function isToekomstig(datum: string, vandaag: string = vandaagAmsterdam()): boolean {
  return datum > vandaag;
}

// Hele kalenderdagen van `vandaag` tot `datum` (positief als de datum in de toekomst ligt).
export function dagenTot(datum: string, vandaag: string = vandaagAmsterdam()): number {
  const dag = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${datum}T00:00:00Z`) - Date.parse(`${vandaag}T00:00:00Z`)) / dag);
}

// Voor de zachte waarschuwing in het factuuritem-formulier.
export const WAARSCHUWING_MAANDEN_VOORUIT = 12;

export function ligtVeelTeVerVooruit(datum: string, vandaag: string = vandaagAmsterdam()): boolean {
  const grens = new Date(`${vandaag}T00:00:00Z`);
  grens.setUTCMonth(grens.getUTCMonth() + WAARSCHUWING_MAANDEN_VOORUIT);
  return datum > grens.toISOString().slice(0, 10);
}

// "over 3 dagen", "morgen", "over 6 weken", "over 4 maanden".
export function overHoeLang(datum: string, vandaag: string = vandaagAmsterdam()): string {
  const dagen = dagenTot(datum, vandaag);
  if (dagen <= 0) return "vandaag";
  if (dagen === 1) return "morgen";
  if (dagen < 14) return `over ${dagen} dagen`;
  if (dagen < 70) return `over ${Math.round(dagen / 7)} weken`;
  return `over ${Math.round(dagen / 30.4)} maanden`;
}

export function datumKort(datum: string): string {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("nl-NL", {
    timeZone: TIJDZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
