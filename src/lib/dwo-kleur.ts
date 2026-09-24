// DWO (doorlooptijd werk → omzet, zie dashboard/page.tsx) hoort onder de 60 dagen
// te blijven, liever nog onder de 45 — deze schaal zet dat om in een StatIcon-tint
// zodat een team meteen ziet of het goed (groen) of slecht (rood) staat.
export function dwoKleurToken(dagen: number | null): "success" | "warning" | "destructive" | "primary" {
  if (dagen === null) return "primary";
  if (dagen <= 45) return "success";
  if (dagen <= 60) return "warning";
  return "destructive";
}
