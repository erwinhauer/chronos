// Exacte decimale rekenkunde voor bedragen.
//
// JavaScript rekent met binaire kommagetallen (double). Veel bedragen in centen, zoals 1,005 of 19,99,
// bestaan daarin niet exact: 1,005 is in werkelijkheid 1,00499999999999989... Het oude `Math.round(n * 100) / 100`
// rondde daardoor soms een cent anders af dan gewone boekhoudkundige afronding, en rondde een exacte halve
// cent bij negatieve bedragen naar nul in plaats van van nul af.
//
// Hier staat één regel voor alle bedragen in Chronos: afronden op hele centen, een exacte helft van nul af
// (1,005 wordt 1,01 en -1,005 wordt -1,01). Dat is ook wat de database doet bij het opslaan in numeric(x,2),
// en wat de nieuwe Microsoft-versie van Chronos gaat doen (decimal met MidpointRounding.AwayFromZero).
//
// Aanpak: elk getal wordt eerst omgezet naar de decimale waarde die de gebruiker of de database bedoelt
// (15 significante cijfers, daar valt de binaire ruis af), daarna wordt met gehele getallen (BigInt) gerekend.
// Alles blijft puur TypeScript zonder afhankelijkheden, zodat het ook buiten Next getest kan worden.

type Dec = { n: bigint; s: number }; // waarde = n / 10^s

const TIEN = BigInt(10);
const NUL = BigInt(0);

function macht10(k: number): bigint {
  return TIEN ** BigInt(k);
}

// De bedoelde decimale waarde van een getal, zonder binaire ruis.
function naarDec(x: number): Dec {
  if (!Number.isFinite(x)) throw new RangeError(`Geen geldig bedrag: ${x}`);
  const delen = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/i.exec(x.toPrecision(15));
  if (!delen) throw new RangeError(`Geen geldig bedrag: ${x}`);
  const breuk = delen[3] ?? "";
  let n = BigInt(`${delen[1]}${delen[2]}${breuk}`);
  let s = breuk.length - Number(delen[4] ?? 0);
  if (s < 0) {
    n *= macht10(-s);
    s = 0;
  }
  return { n, s };
}

function maal(a: Dec, b: Dec): Dec {
  return { n: a.n * b.n, s: a.s + b.s };
}

function plus(a: Dec, b: Dec): Dec {
  const s = Math.max(a.s, b.s);
  return { n: a.n * macht10(s - a.s) + b.n * macht10(s - b.s), s };
}

// Rondt af op `decimalen` decimalen; een exacte helft gaat van nul af. Geeft het gehele aantal eenheden terug.
function rondAf(a: Dec, decimalen: number): bigint {
  if (a.s <= decimalen) return a.n * macht10(decimalen - a.s);
  const deler = macht10(a.s - decimalen);
  const abs = a.n < NUL ? -a.n : a.n;
  let q = abs / deler;
  if ((abs % deler) * BigInt(2) >= deler) q += BigInt(1);
  return a.n < NUL ? -q : q;
}

// Een geheel aantal eenheden terug naar een gewoon getal. Delen door een macht van 10 geeft de dichtstbijzijnde
// double, dus 999 wordt 9.99 en niet 9.989999.... Nul blijft altijd +0, nooit -0.
function naarGetal(eenheden: bigint, decimalen: number): number {
  return Number(eenheden) / 10 ** decimalen;
}

/** Rondt een bedrag af op hele centen; een exacte halve cent gaat van nul af (1,005 wordt 1,01; -2,125 wordt -2,13). */
export function round2(x: number): number {
  return naarGetal(rondAf(naarDec(x), 2), 2);
}

/** Rondt af op één decimaal (uren), een exacte helft van nul af. */
export function round1(x: number): number {
  return naarGetal(rondAf(naarDec(x), 1), 1);
}

/** Exact product van twee getallen, afgerond op centen. Bijvoorbeeld uren x tarief. */
export function vermenigvuldig(a: number, b: number): number {
  return naarGetal(rondAf(maal(naarDec(a), naarDec(b)), 2), 2);
}

/** `percentage` procent van `bedrag`, exact berekend en afgerond op centen. Bijvoorbeeld korting of kantoorkosten. */
export function percentageVan(bedrag: number, percentage: number): number {
  const product = maal(naarDec(bedrag), naarDec(percentage));
  return naarGetal(rondAf({ n: product.n, s: product.s + 2 }, 2), 2);
}

/** Exacte som van bedragen, afgerond op centen. Aftrekken kan met een negatief getal. */
export function optellen(...bedragen: number[]): number {
  const totaal = bedragen.reduce<Dec>((som, b) => plus(som, naarDec(b)), { n: NUL, s: 0 });
  return naarGetal(rondAf(totaal, 2), 2);
}

export type KortingSoort = "bedrag" | "percentage";

export type RegelInvoer = {
  qty: number;
  tarief: number | null;
  kortingType: KortingSoort;
  /** Ingevoerd kortingsbedrag, alleen bij kortingType "bedrag". */
  kortingBedrag: number;
  /** Ingevoerd kortingspercentage, alleen bij kortingType "percentage". */
  kortingPercentage: number | null;
};

export type OpgeslagenRegel = {
  qty: number;
  tarief: number | null;
  honorarium: number;
  korting: number;
  kortingType: KortingSoort;
  kortingPercentage: number | null;
};

/**
 * Honorarium en korting van een factuurregel, exact berekend. Eén plek voor de server (aanmaken en bewerken)
 * en het formulier, zodat het voorbeeld precies klopt met wat wordt opgeslagen.
 *
 * Een bestaand item wordt niet stilletjes herberekend: zijn bedragen zijn ooit vastgelegd met de afronding van
 * toen. Zolang de invoer waaruit ze volgen (aantal en tarief, en bij een kortingspercentage dat percentage)
 * gelijk is aan wat is opgeslagen, blijven honorarium en korting precies zoals ze staan. Wijzigt de invoer,
 * dan worden ze met de huidige afronding opnieuw berekend.
 */
export function berekenRegel(invoer: RegelInvoer, opgeslagen?: OpgeslagenRegel | null): { honorarium: number; korting: number } {
  const honorariumOngewijzigd = opgeslagen != null && opgeslagen.qty === invoer.qty && opgeslagen.tarief === invoer.tarief;
  const honorarium = honorariumOngewijzigd ? opgeslagen.honorarium : vermenigvuldig(invoer.qty, invoer.tarief ?? 0);

  if (invoer.kortingType !== "percentage") return { honorarium, korting: invoer.kortingBedrag };

  const percentageOngewijzigd =
    honorariumOngewijzigd && opgeslagen.kortingType === "percentage" && opgeslagen.kortingPercentage === invoer.kortingPercentage;
  const korting = percentageOngewijzigd ? opgeslagen.korting : percentageVan(honorarium, invoer.kortingPercentage ?? 0);
  return { honorarium, korting };
}
