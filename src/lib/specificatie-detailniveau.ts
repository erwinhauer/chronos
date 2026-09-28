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

// "Kosten van derden" en/of "Korting" tonen is een per-specificatie keuze (zie
// NieuweSpecificatieForm) — Tarief en Aantal (Qty) zijn dat niet: die volgen
// gewoon de eigen, per-klant ingestelde kolomzichtbaarheid
// (klant.kolom_tarief_zichtbaar/kolom_uren_zichtbaar), precies zoals
// kolom_matter_type_land_zichtbaar/kolom_persoon_zichtbaar dat ook al deden.
// (Voorheen forceerde deze functie Tarief/Aantal aan of uit op basis van de
// Kosten-van-derden/Korting-keuze — een "normale" specificatie liet daardoor
// alleen totaalbedragen zien, ook als de klant zelf op Tarief/Aantal-zichtbaar
// stond. Op verzoek losgekoppeld: 2026-09-29.)
// Eén plek voor deze afleiding, gebruikt door zowel de preview/concept
// (nieuwe-specificatie-form.tsx) als de bevroren, al-vastgelegde specificatie
// (specificaties/[id]/page.tsx, specificatie-download.ts). Losgetrokken van
// factuur-specificatie.tsx (een "use client"-component) zodat de server-only
// aanroepers (specificaties/[id]/page.tsx, specificatie-download.ts) een
// gewone functie blijven aanroepen, niet een client-referentie.
export function metSpecificatieDetailniveau<T extends FactuurSpecificatieKlant>(
  klant: T,
  detail: { kolom_externe_kosten_zichtbaar: boolean; kolom_korting_zichtbaar: boolean }
): T {
  return {
    ...klant,
    kolom_externe_kosten_zichtbaar: detail.kolom_externe_kosten_zichtbaar,
    kolom_korting_zichtbaar: detail.kolom_korting_zichtbaar,
  };
}
