// Lichte fuzzy-matcher voor korte lijsten (klantnamen e.d.) — geen library
// nodig voor een handvol tot een paar honderd items. Matcht op subsequence
// per zoekwoord (letters mogen los van elkaar voorkomen, hoeven niet
// aaneengesloten te zijn) zodat een typo of afgekapt woord nog steeds
// gevonden wordt, en scoort aaneengesloten reeksen en woordgrensmatches
// hoger zodat een exacte(re) match altijd boven een losse match uitkomt.

function normaliseer(waarde: string): string {
  return waarde
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function fuzzyScoreToken(token: string, tekst: string): number | null {
  if (!token) return 0;
  let score = 0;
  let tekstIndex = 0;
  let vorigeMatchIndex = -2;
  let eersteMatchIndex = -1;
  for (const letter of token) {
    const index = tekst.indexOf(letter, tekstIndex);
    if (index === -1) return null;
    if (eersteMatchIndex === -1) eersteMatchIndex = index;
    score += index === vorigeMatchIndex + 1 ? 3 : 1;
    if (index === 0 || /\s/.test(tekst[index - 1])) score += 2;
    vorigeMatchIndex = index;
    tekstIndex = index + 1;
  }
  return score - eersteMatchIndex * 0.1;
}

// Geeft een score terug (hoger = betere match), of null als (een van) de
// zoekwoorden niet voorkomen. Meerdere woorden in de zoekterm mogen in een
// andere volgorde staan dan in `tekst` — elk woord moet alleen ergens matchen.
export function fuzzyScore(zoekterm: string, tekst: string): number | null {
  const q = normaliseer(zoekterm).trim();
  if (!q) return 0;
  const t = normaliseer(tekst);
  const tokens = q.split(/\s+/).filter(Boolean);
  let totaal = 0;
  for (const token of tokens) {
    const score = fuzzyScoreToken(token, t);
    if (score === null) return null;
    totaal += score;
  }
  return totaal;
}

// Sorteert `items` op fuzzy-matchkwaliteit tegen `zoekterm` (beste eerst) en
// laat niet-matchende items weg. Bij een lege zoekterm blijft de oorspronkelijke
// volgorde behouden.
export function fuzzyFilter<T>(items: T[], zoekterm: string, naamVan: (item: T) => string): T[] {
  if (!zoekterm.trim()) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(zoekterm, naamVan(item)) }))
    .filter((r): r is { item: T; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
