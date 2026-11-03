import type { UserRole } from "@/lib/supabase/types";

// Wie een nieuw factuuritem mag aanmaken. Gelijk aan de insert-policies op factuuritems
// (medewerker/teamleider voor zichzelf of hun team, beheerder voor iedereen): directie en
// finance zijn read-only en krijgen in de UI een grijze, niet-klikbare knop.
export function magFactuuritemAanmaken(rol: UserRole | null | undefined): boolean {
  return rol === "medewerker" || rol === "teamleider" || rol === "beheerder";
}

export const GEEN_FACTUURITEM_AANMAKEN_UITLEG =
  "Met jouw rol kun je geen factuuritems aanmaken. Wissel naar de rol Medewerker of Praktijkvoerder.";
