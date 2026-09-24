// Gedeelde aggregatielogica voor "omzet per categorie/land" — gebruikt door
// het dashboard (bedrijfsbreed/per team) en het klantenoverzicht (per klant).
// Eén plek zodat beide altijd dezelfde definitie van "categorie" en "land"
// per regel hanteren (het eerste dossier op het item, zie eersteDossier).

import { regelbedrag } from "@/lib/factuurbedragen";
import { landNaamVoorIso, codeVoorDienstLabel, PRODUCTGROEP_CODES } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";

export type DossierVoorAggregatie = { type_dienst: string | null; land: string | null; volgorde: number };

export type RegelVoorAggregatie = {
  honorarium: number;
  externe_kosten: number;
  korting: number;
  factuuritem_dossiers: DossierVoorAggregatie[];
};

export function eersteDossier(r: RegelVoorAggregatie) {
  const dossiers = r.factuuritem_dossiers ?? [];
  if (dossiers.length === 0) return null;
  return dossiers.slice().sort((a, b) => a.volgorde - b.volgorde)[0];
}

export function eersteDienst(r: RegelVoorAggregatie): string {
  return eersteDossier(r)?.type_dienst ?? "Onbekend";
}

export function eersteLandIso(r: RegelVoorAggregatie): string | null {
  return eersteDossier(r)?.land ?? null;
}

// Omzet per productgroep, geordend op de acht dossiernummercodes die de
// directie/beheerder-rapportage vast wil zien (TM/D/I/O/CA/S/W/@) — overige
// diensten (bv. Algemeen/Mutaties) komen er in de weergave achteraan, niet weg.
export function groepeerPerProductgroep<T extends RegelVoorAggregatie>(rows: T[]) {
  const map = new Map<string, { code: string; label: string; omzet: number; aantal: number }>();
  for (const r of rows) {
    const label = eersteDienst(r);
    const code = label === "Onbekend" ? "—" : codeVoorDienstLabel(label);
    const bestaand = map.get(label) ?? { code, label, omzet: 0, aantal: 0 };
    bestaand.omzet += regelbedrag(r);
    bestaand.aantal += 1;
    map.set(label, bestaand);
  }
  const volgordeIndex = (code: string) => {
    const i = PRODUCTGROEP_CODES.indexOf(code);
    return i === -1 ? PRODUCTGROEP_CODES.length : i;
  };
  return Array.from(map.values()).sort((a, b) => volgordeIndex(a.code) - volgordeIndex(b.code));
}

export function groepeerPerLand<T extends RegelVoorAggregatie>(rows: T[], landenMap: LandenMap, top: number) {
  const map = new Map<string, { landNaam: string; iso: string | null; omzet: number }>();
  for (const r of rows) {
    const iso = eersteLandIso(r);
    const landNaam = landNaamVoorIso(iso, landenMap);
    const bestaand = map.get(landNaam) ?? { landNaam, iso, omzet: 0 };
    bestaand.omzet += regelbedrag(r);
    map.set(landNaam, bestaand);
  }
  return Array.from(map.values())
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, top);
}

// Kruistabel productgroep × land — rijen in dezelfde vaste productgroepvolgorde als
// groepeerPerProductgroep, kolommen de top-`top`-landen (qua totale omzet, zelfde
// bepaling als groepeerPerLand); landen buiten de top vallen samen onder "Overig",
// net als groepeerPerLand dat vandaag al doet voor de losse landentabel.
export function groepeerPerProductgroepEnLand<T extends RegelVoorAggregatie>(
  rows: T[],
  landenMap: LandenMap,
  top: number
) {
  const topLanden = groepeerPerLand(rows, landenMap, top);
  const kolomVolgorde = topLanden.map((l) => l.landNaam);
  const kolomIndex = new Map(kolomVolgorde.map((naam, i) => [naam, i]));
  const heeftOverig = new Set(rows.map((r) => landNaamVoorIso(eersteLandIso(r), landenMap))).size > kolomVolgorde.length;
  const kolommen = heeftOverig ? [...kolomVolgorde, "Overig"] : kolomVolgorde;

  const rijenMap = new Map<string, { code: string; label: string; perKolom: number[]; totaal: number }>();
  for (const r of rows) {
    const label = eersteDienst(r);
    const code = label === "Onbekend" ? "—" : codeVoorDienstLabel(label);
    const landNaam = landNaamVoorIso(eersteLandIso(r), landenMap);
    const kolom = kolomIndex.has(landNaam) ? kolomIndex.get(landNaam)! : kolommen.length - 1;
    const bestaand = rijenMap.get(label) ?? { code, label, perKolom: kolommen.map(() => 0), totaal: 0 };
    const bedrag = regelbedrag(r);
    bestaand.perKolom[kolom] += bedrag;
    bestaand.totaal += bedrag;
    rijenMap.set(label, bestaand);
  }

  const volgordeIndex = (code: string) => {
    const i = PRODUCTGROEP_CODES.indexOf(code);
    return i === -1 ? PRODUCTGROEP_CODES.length : i;
  };
  const rijen = Array.from(rijenMap.values()).sort((a, b) => volgordeIndex(a.code) - volgordeIndex(b.code));
  const totaalPerKolom = kolommen.map((_, i) => rijen.reduce((sum, rij) => sum + rij.perKolom[i], 0));
  const totaal = rijen.reduce((sum, rij) => sum + rij.totaal, 0);

  return { kolommen, rijen, totaalPerKolom, totaal };
}
