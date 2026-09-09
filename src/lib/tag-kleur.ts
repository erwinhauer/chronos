// Deterministische kleur per tekstwaarde, voor gekleurde tags/avatars door de
// hele app — dezelfde 5 categorische kleuren als omzet-grafiek.tsx en de
// PO-nummer-tags in factuur-groep.tsx, dus geen nieuwe, niet-merk-kleuren.
const TAG_KLEUREN = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function hashNaarIndex(waarde: string, lengte: number) {
  let hash = 0;
  for (let i = 0; i < waarde.length; i++) {
    hash = (hash * 31 + waarde.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % lengte;
}

export function tagKleur(waarde: string) {
  return TAG_KLEUREN[hashNaarIndex(waarde, TAG_KLEUREN.length)];
}

// Kant-en-klare inline-stijl voor een gekleurde, getinte tag (badge/avatar).
export function tagKleurStijl(waarde: string) {
  const kleur = tagKleur(waarde);
  return {
    color: kleur,
    borderColor: `color-mix(in oklch, ${kleur} 40%, transparent)`,
    backgroundColor: `color-mix(in oklch, ${kleur} 12%, transparent)`,
  };
}

// Vaste (niet per-waarde gehashte) variant, voor tags die bewust allemaal
// dezelfde kleur moeten hebben (bv. land-tags) — zelfde donkerblauwe
// merkkleur als --primary, in plaats van de categorische tagKleur-reeks.
export const VASTE_TAG_STIJL = {
  color: "var(--primary)",
  borderColor: "color-mix(in oklch, var(--primary) 40%, transparent)",
  backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)",
};

// Voor medewerker-badges: elke actieve medewerker moet een eigen, van elkaar
// te onderscheiden kleur krijgen — een hash in de 5 categorische
// tagKleur-kleuren (hierboven) botst zodra er meer dan 5 mensen zijn (bv. bij
// 8 teamleden delen er standaard al 3 paren dezelfde kleur). In plaats daarvan
// verdelen we de kleurencirkel gelijk over ALLE actieve medewerkers, op basis
// van hun positie in `alleMedewerkerIds` (dezelfde, stabiele volgorde overal
// doorgeven — bv. op naam gesorteerd — zodat iemands kleur niet per pagina
// verschilt).
export function medewerkerKleurStijl(medewerkerId: string, alleMedewerkerIds: string[]) {
  const index = alleMedewerkerIds.indexOf(medewerkerId);
  const totaal = alleMedewerkerIds.length;
  const hue = totaal > 0 && index >= 0 ? Math.round((index / totaal) * 360) : 0;
  const kleur = `hsl(${hue} 70% 38%)`;
  return {
    color: kleur,
    borderColor: `hsl(${hue} 70% 38% / 40%)`,
    backgroundColor: `hsl(${hue} 70% 38% / 12%)`,
  };
}
