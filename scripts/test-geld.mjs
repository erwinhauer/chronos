// Tests voor de exacte bedragenrekenkunde (src/lib/geld.ts). Draai met: npm run test:geld
// Vereist Node 22.6+ (type stripping, standaard aan vanaf Node 23.6). Geen extra pakketten nodig.
import test from "node:test";
import assert from "node:assert/strict";
import { round1, round2, vermenigvuldig, percentageVan, optellen, berekenRegel } from "../src/lib/geld.ts";
import { berekenFactuurtotalen, berekenBtw, nettoOmzetPlaceholder } from "../src/lib/factuurbedragen.ts";

test("round2: een exacte halve cent gaat van nul af", () => {
  const gevallen = [
    [1.005, 1.01], [2.675, 2.68], [1.255, 1.26], [0.285, 0.29], [1.115, 1.12], [8.345, 8.35],
    [-0.125, -0.13], [-1.005, -1.01], [-0.005, -0.01], [-2.5, -2.5], [-2.125, -2.13], [0.005, 0.01],
    [1.004, 1], [1.006, 1.01], [-1.004, -1], [-1.006, -1.01], [0, 0], [100, 100], [3770, 3770],
  ];
  for (const [invoer, verwacht] of gevallen) assert.equal(round2(invoer), verwacht, `round2(${invoer})`);
});

test("round2: nooit min nul", () => {
  assert.ok(Object.is(round2(-0), 0));
  assert.ok(Object.is(round2(-0.004), 0));
  assert.ok(Object.is(round2(0.004), 0));
});

test("round2: bedragen die al op centen staan blijven onaangeroerd", () => {
  for (const x of [0.01, 0.07, 19.99, 33.33, 330.33, 825.83, 1234567.89, -0.01, -19.99, -825.83, 9999999.99]) {
    assert.equal(round2(x), x, `round2(${x})`);
  }
});

test("round1: uren op een decimaal, exacte helft van nul af", () => {
  const gevallen = [[0.25, 0.3], [0.35, 0.4], [1.45, 1.5], [0.05, 0.1], [0.04, 0], [2.5, 2.5], [-0.25, -0.3]];
  for (const [invoer, verwacht] of gevallen) assert.equal(round1(invoer), verwacht, `round1(${invoer})`);
});

test("vermenigvuldig: honorarium uit uren x tarief (oracle T-04 t/m T-09)", () => {
  assert.equal(vermenigvuldig(2.5, 330), 825);
  assert.equal(vermenigvuldig(0.3, 330), 99);
  assert.equal(vermenigvuldig(0.5, 19.99), 10); // exact 9,995: was 9,99
  assert.equal(vermenigvuldig(1.5, 33.33), 50); // exact 49,995
  assert.equal(vermenigvuldig(2.5, -330.33), -825.83); // exact -825,825: was -825,82
  assert.equal(vermenigvuldig(0.5, 0.01), 0.01);
  assert.equal(vermenigvuldig(0.5, -0.01), -0.01);
});

test("percentageVan: korting en kantoorkosten", () => {
  assert.equal(percentageVan(825, 10), 82.5);
  assert.equal(percentageVan(333.33, 15), 50); // exact 49,9995
  assert.equal(percentageVan(275.25, 6), 16.52); // exact 16,515
  assert.equal(percentageVan(8.25, 6), 0.5); // exact 0,495: was 0,49 of 0,5 afhankelijk van de binaire waarde
  assert.equal(percentageVan(100, 25), 25);
  assert.equal(percentageVan(-825.83, 10), -82.58); // exact -82,583
});

test("optellen: exacte som, geen binaire ruis", () => {
  assert.equal(optellen(0.1, 0.2), 0.3);
  assert.equal(optellen(19.99, 0.01), 20);
  assert.equal(optellen(100, 50, -30.5), 119.5);
  assert.equal(optellen(), 0);
  const som = Array.from({ length: 1000 }, () => 0.1);
  assert.equal(optellen(...som), 100);
});

test("ongeldige invoer geeft een fout in plaats van een stil verkeerd bedrag", () => {
  assert.throws(() => round2(Number.NaN), RangeError);
  assert.throws(() => round2(Infinity), RangeError);
  assert.throws(() => vermenigvuldig(1, Number.NaN), RangeError);
});

// Onafhankelijke referentie in gehele getallen: geen kommagetallen, geen BigInt, alleen delen met rest.
function rondHalfVanNul(teller, noemer) {
  const abs = Math.abs(teller);
  let q = Math.floor(abs / noemer);
  if ((abs % noemer) * 2 >= noemer) q += 1;
  return teller < 0 ? -q : q;
}

test("vermenigvuldig komt overeen met de referentie voor alle combinaties uren x tarief", () => {
  let aantal = 0;
  for (let tienden = 1; tienden <= 50; tienden++) {
    for (let cent = 1; cent <= 10000; cent++) {
      for (const teken of [1, -1]) {
        const verwacht = rondHalfVanNul(tienden * cent * teken, 10) / 100; // tienden x centen = tienden van centen
        const gekregen = vermenigvuldig(tienden / 10, (teken * cent) / 100);
        if (gekregen !== verwacht) assert.fail(`${tienden / 10} x ${(teken * cent) / 100}: ${gekregen} i.p.v. ${verwacht}`);
        aantal++;
      }
    }
  }
  assert.equal(aantal, 1_000_000);
});

test("percentageVan komt overeen met de referentie voor bedragen en percentages", () => {
  for (let cent = 1; cent <= 20000; cent += 7) {
    for (let promille = 0; promille <= 10000; promille += 125) { // percentage in honderdsten: 0,00 t/m 100,00
      for (const teken of [1, -1]) {
        const verwacht = rondHalfVanNul(teken * cent * promille, 10000) / 100;
        const gekregen = percentageVan((teken * cent) / 100, promille / 100);
        if (gekregen !== verwacht) assert.fail(`${(teken * cent) / 100} x ${promille / 100}%: ${gekregen} i.p.v. ${verwacht}`);
      }
    }
  }
});

test("berekenRegel: nieuw item gebruikt de exacte afronding", () => {
  const r = berekenRegel({ qty: 0.5, tarief: 19.99, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 10 });
  assert.equal(r.honorarium, 10); // exact 9,995
  assert.equal(r.korting, 1); // 10% van 10,00
  assert.deepEqual(berekenRegel({ qty: 2.5, tarief: -330.33, kortingType: "bedrag", kortingBedrag: 0, kortingPercentage: null }), { honorarium: -825.83, korting: 0 });
  assert.deepEqual(berekenRegel({ qty: 3, tarief: null, kortingType: "bedrag", kortingBedrag: 5, kortingPercentage: null }), { honorarium: 0, korting: 5 });
});

// Een item dat vroeger met de oude afronding is opgeslagen: 0,5 x 19,99 gaf toen 9,99 (en 10% korting daarop 1,00).
const OUD = { qty: 0.5, tarief: 19.99, honorarium: 9.99, korting: 1, kortingType: "percentage", kortingPercentage: 10 };

test("berekenRegel: een bestaand item blijft ongewijzigd zolang de invoer gelijk is", () => {
  const zelfde = { qty: 0.5, tarief: 19.99, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 10 };
  assert.deepEqual(berekenRegel(zelfde, OUD), { honorarium: 9.99, korting: 1 });
});

test("berekenRegel: bij een gewijzigd tarief of aantal wordt opnieuw berekend", () => {
  const nieuwTarief = berekenRegel({ qty: 0.5, tarief: 20.01, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 10 }, OUD);
  assert.equal(nieuwTarief.honorarium, 10.01); // exact 10,005
  const nieuwAantal = berekenRegel({ qty: 1.5, tarief: 19.99, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 10 }, OUD);
  assert.equal(nieuwAantal.honorarium, 29.99); // exact 29,985
});

test("berekenRegel: alleen het kortingspercentage wijzigen herberekent de korting, niet het honorarium", () => {
  const r = berekenRegel({ qty: 0.5, tarief: 19.99, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 15 }, OUD);
  assert.equal(r.honorarium, 9.99);
  assert.equal(r.korting, 1.5); // 15% van het opgeslagen 9,99 = 1,4985 (op centen: 1,50)
});

test("berekenRegel: van percentage naar vast bedrag en terug", () => {
  const naarBedrag = berekenRegel({ qty: 0.5, tarief: 19.99, kortingType: "bedrag", kortingBedrag: 2, kortingPercentage: null }, OUD);
  assert.deepEqual(naarBedrag, { honorarium: 9.99, korting: 2 });
  const bedragOud = { ...OUD, kortingType: "bedrag", kortingPercentage: null, korting: 2 };
  const terugNaarPercentage = berekenRegel({ qty: 0.5, tarief: 19.99, kortingType: "percentage", kortingBedrag: 0, kortingPercentage: 10 }, bedragOud);
  assert.equal(terugNaarPercentage.honorarium, 9.99); // aantal en tarief ongewijzigd: honorarium blijft
  assert.equal(terugNaarPercentage.korting, 1); // 10% van 9,99 = 0,999 -> 1,00
});

const regel = (honorarium, externe_kosten, korting, kantoorkosten_van_toepassing = true) => ({ honorarium, externe_kosten, korting, kantoorkosten_van_toepassing });

test("berekenFactuurtotalen: kantoorkosten op een exacte halve cent gaan omhoog", () => {
  const t = berekenFactuurtotalen([regel(275.25, 0, 0)], 6); // 6% = 16,515
  assert.equal(t.totaalKantoorkosten, 16.52);
  assert.equal(t.subtotaalVoorExtraKorting, 291.77);
});

test("berekenFactuurtotalen: minimum 15, maximum 200 en geen vloer zonder grondslag", () => {
  assert.equal(berekenFactuurtotalen([regel(100, 0, 0)], 6).totaalKantoorkosten, 15); // 6,00 wordt 15
  assert.equal(berekenFactuurtotalen([regel(10000, 0, 0)], 6).totaalKantoorkosten, 200); // 600 wordt 200
  assert.equal(berekenFactuurtotalen([regel(100, 0, 0, false)], 6).totaalKantoorkosten, 0);
  assert.equal(berekenFactuurtotalen([], 6).totaalKantoorkosten, 0);
});

test("berekenFactuurtotalen: som van meerdere regels, kosten en korting, zonder binaire ruis", () => {
  const items = [regel(0.1, 0, 0), regel(0.2, 0, 0), regel(330, 25, 33), regel(-100, 0, 0, false)];
  const t = berekenFactuurtotalen(items, 6);
  assert.equal(t.totaalHonorarium, 230.3);
  assert.equal(t.totaalExterneKosten, 25);
  assert.equal(t.totaalKorting, 33);
  // grondslag = (0,1) + (0,2) + (330 + 25 - 33); het negatieve item telt niet mee voor kantoorkosten
  assert.equal(t.totaalKantoorkosten, 19.34); // 6% van 322,30 = 19,338 -> 19,34
});

test("berekenFactuurtotalen: negatieve bedragen (credit) ronden van nul af", () => {
  const t = berekenFactuurtotalen([regel(-825.83, 0, 0)], 6);
  assert.equal(t.totaalHonorarium, -825.83);
  assert.equal(t.totaalKantoorkosten, 0); // negatieve grondslag: geen kantoorkosten
});

test("btw en netto-omzet volgen dezelfde afronding", () => {
  assert.equal(berekenBtw(100.5, 21), 21.11); // 21,105
  assert.equal(nettoOmzetPlaceholder(1000), 670);
  assert.equal(nettoOmzetPlaceholder(0.75), 0.5); // 0,5025
});
