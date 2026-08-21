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
