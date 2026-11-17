// Datum en tijd in Amsterdamse tijd, ongeacht de tijdzone van de server of de browser.
// Een <input type="datetime-local"> levert "2026-11-18T22:30" zonder tijdzone; die waarde is
// voor Chronos altijd Amsterdamse tijd.

const TIJDZONE = "Europe/Amsterdam";

function offsetMs(timestamp: number): number {
  const delen = new Intl.DateTimeFormat("en-US", {
    timeZone: TIJDZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(timestamp));
  const waarde = (type: string) => Number(delen.find((d) => d.type === type)?.value);
  const alsUtc = Date.UTC(waarde("year"), waarde("month") - 1, waarde("day"), waarde("hour"), waarde("minute"), waarde("second"));
  return alsUtc - Math.floor(timestamp / 1000) * 1000;
}

// "2026-11-18T22:30" (Amsterdamse tijd) naar een Date; null als de invoer geen geldige datum met tijd is.
export function amsterdamNaarDate(invoer: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(invoer.trim());
  if (!m) return null;
  const [jaar, maand, dag, uur, minuut] = m.slice(1).map(Number);
  const alsUtc = Date.UTC(jaar, maand - 1, dag, uur, minuut);
  let ts = alsUtc - offsetMs(alsUtc);
  const tweede = alsUtc - offsetMs(ts);
  if (tweede !== ts) ts = tweede;
  const datum = new Date(ts);
  if (Number.isNaN(datum.getTime())) return null;
  // Een onmogelijke datum (bv. maand 13) schuift door naar een andere datum: dan afwijzen.
  return dateNaAmsterdamInvoer(datum.toISOString()) === invoer.trim() ? datum : null;
}

// ISO-tijdstip naar de waarde voor een <input type="datetime-local">, in Amsterdamse tijd.
export function dateNaAmsterdamInvoer(iso: string | null): string {
  if (!iso) return "";
  const tekst = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIJDZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return tekst.replace(" ", "T");
}

export function formatteerAmsterdam(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: TIJDZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
