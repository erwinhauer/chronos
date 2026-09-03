// Losstaand van patricia.ts (dat `mssql` importeert, alleen server-side bruikbaar)
// zodat dit ook vanuit client components geïmporteerd kan worden.

// Normaliseert een bedrijfsnaam voor het vergelijken van Patricia's Client-naam
// met Chronos' eigen klantenlijst: kleine letters, rechtsvormen/leestekens
// eraf. Bedoeld voor een voorzichtige, exacte match — geen fuzzy scoring —
// zodat een factuuritem nooit stilzwijgend aan de verkeerde klant hangt.
const RECHTSVORMEN = [
  "b.v.", "bv", "n.v.", "nv", "gmbh", "s.a.", "sa", "ltd.", "ltd", "llc", "inc.", "inc",
  "co. ltd", "co.,ltd", "co ltd", "corp.", "corp", "ag", "plc", "s.p.a.", "spa",
];

export function normaliseerBedrijfsnaam(naam: string): string {
  // Punten/komma's verwijderen (niet vervangen door een spatie) zodat een
  // afkorting als "N.V." samen "nv" wordt — anders valt hij in twee losse
  // woorden uiteen en herkent de rechtsvorm-lijst hieronder hem niet meer.
  let n = naam
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const vorm of RECHTSVORMEN) {
    const re = new RegExp(`(^|\\s)${vorm.replace(/\./g, "")}(\\s|$)`, "g");
    n = n.replace(re, " ").replace(/\s+/g, " ").trim();
  }
  return n;
}

export function vindKlantVoorPatriciaNaam<T extends { id: string; naam: string }>(
  klanten: T[],
  patriciaNaam: string
): T | null {
  const genormaliseerd = normaliseerBedrijfsnaam(patriciaNaam);
  const matches = klanten.filter((k) => normaliseerBedrijfsnaam(k.naam) === genormaliseerd);
  return matches.length === 1 ? matches[0] : null;
}
