// Afleiding van Type Dienst en land uit het dossiernummer.
// Opbouw: <prefix><nummer><landcode><suffix>, bv. O12345IN00 = Oppositie in India.
// Wordt zowel client-side (live preview in het formulier) als server-side
// (autoritatieve validatie/opslag in de action) gebruikt — de server vertrouwt
// nooit de door de client afgeleide waarden.

export type DossiernummerParseResult = {
  typeCode: string;
  typeLabel: string;
  landIso: string;
  landNaam: string;
  nummer: string;
  suffix: string;
};

// Langste prefix eerst, anders zou "CA12345NL00" fout als "C" + "A12345..." gelezen worden.
const TYPE_PREFIXES: { code: string; label: string }[] = [
  { code: "CA", label: "Cancellations" },
  { code: "TM", label: "Merken" },
  { code: "D", label: "Modellen" },
  { code: "O", label: "Opposities" },
  { code: "I", label: "Inbreuken" },
  { code: "A", label: "Overeenkomsten" },
  { code: "@", label: "Domeinnamen" },
  { code: "G", label: "Algemeen" },
  { code: "C", label: "Mutaties" },
  { code: "W", label: "Bewaking" },
];

// ISO 3166-1 alpha-2 → Nederlandse landnaam, plus praktijk-uitzonderingen (WIPO/EUIPO)
// die geen ISO-land zijn maar wel als "landcode" in dossiernummers voorkomen.
// Niet uitputtend: onbekende codes vallen terug op de kale code zelf.
const LANDNAMEN: Record<string, string> = {
  WO: "Internationale registratie",
  EU: "Europese Unie",
  BX: "Benelux",
  NL: "Nederland",
  BE: "België",
  LU: "Luxemburg",
  DE: "Duitsland",
  FR: "Frankrijk",
  GB: "Verenigd Koninkrijk",
  UK: "Verenigd Koninkrijk",
  IE: "Ierland",
  ES: "Spanje",
  PT: "Portugal",
  IT: "Italië",
  CH: "Zwitserland",
  AT: "Oostenrijk",
  DK: "Denemarken",
  SE: "Zweden",
  NO: "Noorwegen",
  FI: "Finland",
  IS: "IJsland",
  PL: "Polen",
  CZ: "Tsjechië",
  SK: "Slowakije",
  HU: "Hongarije",
  RO: "Roemenië",
  BG: "Bulgarije",
  HR: "Kroatië",
  SI: "Slovenië",
  GR: "Griekenland",
  EE: "Estland",
  LV: "Letland",
  LT: "Litouwen",
  MT: "Malta",
  CY: "Cyprus",
  US: "Verenigde Staten",
  CA: "Canada",
  MX: "Mexico",
  BR: "Brazilië",
  AR: "Argentinië",
  CL: "Chili",
  CO: "Colombia",
  PE: "Peru",
  CN: "China",
  JP: "Japan",
  KR: "Zuid-Korea",
  IN: "India",
  ID: "Indonesië",
  MY: "Maleisië",
  SG: "Singapore",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Filipijnen",
  PK: "Pakistan",
  BD: "Bangladesh",
  AU: "Australië",
  NZ: "Nieuw-Zeeland",
  ZA: "Zuid-Afrika",
  NG: "Nigeria",
  EG: "Egypte",
  MA: "Marokko",
  AE: "Verenigde Arabische Emiraten",
  SA: "Saoedi-Arabië",
  IL: "Israël",
  TR: "Turkije",
  RU: "Rusland",
  UA: "Oekraïne",
  SV: "El Salvador",
  LK: "Sri Lanka",
};

// `type_dienst` wordt bij aanmaken vastgelegd als het Nederlandse label (zie
// TYPE_PREFIXES) — deze vertaaltabel is puur voor weergave op een Engelstalige
// specificatie, zonder de opgeslagen waarde zelf aan te passen.
const TYPE_LABEL_EN: Record<string, string> = {
  Cancellations: "Cancellations",
  Merken: "Trademarks",
  Modellen: "Designs",
  Opposities: "Oppositions",
  Inbreuken: "Infringements",
  Overeenkomsten: "Agreements",
  Domeinnamen: "Domain names",
  Algemeen: "General",
  Mutaties: "Recordals",
  Bewaking: "Watch services",
};

export function typeDienstLabel(typeDienst: string | null, taal: "nl" | "en"): string {
  if (!typeDienst) return "—";
  if (taal === "en") return TYPE_LABEL_EN[typeDienst] ?? typeDienst;
  return typeDienst;
}

function tryParsePrefix(code: string, rest: string): DossiernummerParseResult | null {
  const pattern = new RegExp(`^(\\d+)([A-Z]{2})(\\d*)$`);
  const match = pattern.exec(rest);
  if (!match) return null;
  const [, nummer, landIso, suffix] = match;
  const label = TYPE_PREFIXES.find((p) => p.code === code)!.label;
  return {
    typeCode: code,
    typeLabel: label,
    landIso,
    landNaam: LANDNAMEN[landIso] ?? landIso,
    nummer,
    suffix,
  };
}

export function parseDossiernummer(input: string): DossiernummerParseResult | null {
  const value = input.trim().toUpperCase();
  if (!value) return null;

  for (const { code } of TYPE_PREFIXES) {
    if (value.startsWith(code)) {
      const result = tryParsePrefix(code, value.slice(code.length));
      if (result) return result;
    }
  }
  return null;
}

export const DOSSIERNUMMER_VOORBEELD = "TM93905GB00";

// `landen` komt bij voorkeur van de beheerder-bewerkbare `landcodes`-tabel
// (zie src/lib/landen.ts); zonder dat argument valt dit terug op de statische
// lijst hierboven (die overigens ook de seed-data voor die tabel is).
export function landNaamVoorIso(iso: string | null, landen?: Record<string, { nl: string; en: string }>): string {
  if (!iso) return "—";
  if (landen?.[iso]) return landen[iso].nl;
  return LANDNAMEN[iso] ?? iso;
}
