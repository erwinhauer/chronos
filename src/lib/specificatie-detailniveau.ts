export type FactuurSpecificatieKlant = {
  naam: string;
  adres: string | null;
  specificatietaal: "nl" | "en";
  kolom_matter_type_land_zichtbaar: boolean;
  kolom_persoon_zichtbaar: boolean;
  kolom_uren_zichtbaar: boolean;
  kolom_tarief_zichtbaar: boolean;
  kolom_externe_kosten_zichtbaar: boolean;
  kolom_korting_zichtbaar: boolean;
};

// De keuze om "Kosten van derden" en/of "Korting" te tonen (per specificatie
// gekozen, zie NieuweSpecificatieForm) bepaalt ook of Tarief en Aantal (Qty)
// zichtbaar zijn: in de simpele specificatie (geen van beide aan) hoort geen
// van beide te staan, in de uitgebreide specificatie horen beide er juist bij
// — samen met Kosten van derden/Korting laten ze zien hoe het regelbedrag is
// opgebouwd. Eén plek voor deze afleiding, gebruikt door zowel de
// preview/concept (nieuwe-specificatie-form.tsx) als de bevroren, al-
// vastgelegde specificatie (specificaties/[id]/page.tsx, specificatie-download.ts).
// Losgetrokken van factuur-specificatie.tsx (een "use client"-component) zodat
// de server-only aanroepers (specificaties/[id]/page.tsx, specificatie-
// download.ts) een gewone functie blijven aanroepen, niet een client-referentie.
export function metSpecificatieDetailniveau<T extends FactuurSpecificatieKlant>(
  klant: T,
  detail: { kolom_externe_kosten_zichtbaar: boolean; kolom_korting_zichtbaar: boolean }
): T {
  const uitgebreid = detail.kolom_externe_kosten_zichtbaar || detail.kolom_korting_zichtbaar;
  return {
    ...klant,
    kolom_tarief_zichtbaar: klant.kolom_tarief_zichtbaar && uitgebreid,
    kolom_uren_zichtbaar: klant.kolom_uren_zichtbaar || uitgebreid,
    kolom_externe_kosten_zichtbaar: detail.kolom_externe_kosten_zichtbaar,
    kolom_korting_zichtbaar: detail.kolom_korting_zichtbaar,
  };
}
