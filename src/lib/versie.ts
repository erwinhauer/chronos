// Versienummers (semver, "1.3.0") vergelijken. Nodig omdat meerdere releases op dezelfde dag
// kunnen uitkomen; sorteren op releasedatum alleen geeft dan een willekeurige "nieuwste".
function delen(versie: string): number[] {
  return versie.split(".").map((d) => Number.parseInt(d, 10) || 0);
}

export function vergelijkVersie(a: string, b: string): number {
  const da = delen(a);
  const db = delen(b);
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const verschil = (da[i] ?? 0) - (db[i] ?? 0);
    if (verschil !== 0) return verschil;
  }
  return 0;
}

// Nieuwste eerst: op releasedatum, bij gelijke datum op versienummer.
export function sorteerReleasesNieuwsteEerst<T extends { versienummer: string; releasedatum: string }>(releases: T[]): T[] {
  return [...releases].sort(
    (a, b) => b.releasedatum.localeCompare(a.releasedatum) || vergelijkVersie(b.versienummer, a.versienummer)
  );
}
