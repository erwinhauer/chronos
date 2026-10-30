type ItemMetDossiers = {
  dossiers: { dossiernummer: string; matter_naam: string | null; volgorde: number }[];
};

export type SpecificatieSectie<T> = {
  dossiernummer: string;
  matterNaam: string | null;
  items: T[];
};

// Groepeert specificatie-items per dossier — het EERSTE dossier van een item
// bepaalt de groep, zelfde vereenvoudiging als bij "Groeperen op dossier" op de
// factuuritems-per-klant-pagina (een item met meerdere dossiers hoort maar bij
// één groep, anders zou het totaal per groep niet meer kloppen). Eén plek voor
// de preview (factuur-specificatie.tsx) én de PDF (specificatie-pdf.tsx), zodat
// beide altijd dezelfde groepen en volgorde tonen. Binnen een groep blijft de
// volgorde van `items` (op datum) behouden.
export function groepeerItemsPerDossier<T extends ItemMetDossiers>(items: T[]): SpecificatieSectie<T>[] {
  const map = new Map<string, SpecificatieSectie<T>>();
  for (const item of items) {
    const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
    const eerste = dossiers[0];
    const sleutel = eerste?.dossiernummer ?? "—";
    const bestaand = map.get(sleutel);
    if (bestaand) bestaand.items.push(item);
    else map.set(sleutel, { dossiernummer: sleutel, matterNaam: eerste?.matter_naam ?? null, items: [item] });
  }
  return Array.from(map.values()).sort((a, b) => a.dossiernummer.localeCompare(b.dossiernummer));
}
