// Regels voor een zelfgekozen wachtwoord — gedeeld tussen de live-checklist in
// de UI (client) en de server-side validatie (nooit alleen op de client
// vertrouwen), zodat ze nooit uit de pas kunnen lopen.
export type WachtwoordRegel = { label: string; voldoet: (wachtwoord: string) => boolean };

export const WACHTWOORD_REGELS: WachtwoordRegel[] = [
  { label: "Tussen de 8 en 25 tekens", voldoet: (ww) => ww.length >= 8 && ww.length <= 25 },
  { label: "Minimaal één hoofdletter", voldoet: (ww) => /[A-Z]/.test(ww) },
  { label: "Minimaal één cijfer", voldoet: (ww) => /[0-9]/.test(ww) },
  { label: "Minimaal één speciaal teken", voldoet: (ww) => /[^A-Za-z0-9]/.test(ww) },
];

export function wachtwoordVoldoet(wachtwoord: string): boolean {
  return WACHTWOORD_REGELS.every((regel) => regel.voldoet(wachtwoord));
}

export function wachtwoordFoutmelding(wachtwoord: string): string | null {
  if (wachtwoordVoldoet(wachtwoord)) return null;
  return "Het wachtwoord voldoet niet aan de eisen: tussen de 8 en 25 tekens, met minimaal één hoofdletter, één cijfer en één speciaal teken.";
}

// Tijdelijk standaardwachtwoord voor (nieuwe en bestaande) accounts tijdens de
// overstap van magic-link naar wachtwoord-login — altijd samen met
// must_change_password: true, zodat dit nooit een blijvend gedeeld wachtwoord
// wordt (zie logInMetWachtwoord/createGebruiker/de middleware).
export const STANDAARD_WACHTWOORD = "Chronos2026!";
