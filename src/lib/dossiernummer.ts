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
// die geen ISO-land zijn maar wel als "landcode" in dossiernummers voorkomen. Volledig
// (alle 248 ISO-codes + WO/EU/BX/UK) en 1-op-1 gelijk aan de seed-data van de
// beheerder-bewerkbare `landcodes`-tabel (supabase/migrations/20260820171655_landcodes.sql)
// — deze lijst is puur de fallback voor client-only weergave zonder databasetoegang
// (zie dossiernummer-tag-input.tsx); overal elders wordt de DB-lijst gebruikt via
// landNaamVoorIso(iso, landen).
const LANDNAMEN: Record<string, string> = {
  AD: "Andorra",
  AE: "Verenigde Arabische Emiraten",
  AF: "Afghanistan",
  AG: "Antigua en Barbuda",
  AI: "Anguilla",
  AL: "Albanië",
  AM: "Armenië",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentinië",
  AS: "Amerikaans-Samoa",
  AT: "Oostenrijk",
  AU: "Australië",
  AW: "Aruba",
  AX: "Ålandeilanden",
  AZ: "Azerbeidzjan",
  BA: "Bosnië en Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "België",
  BF: "Burkina Faso",
  BG: "Bulgarije",
  BH: "Bahrein",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint-Barthélemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivia",
  BQ: "Bonaire, Sint Eustatius en Saba",
  BR: "Brazilië",
  BS: "Bahama's",
  BT: "Bhutan",
  BV: "Bouveteiland",
  BW: "Botswana",
  BY: "Wit-Rusland",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocoseilanden",
  CD: "Congo-Kinshasa (DR Congo)",
  CF: "Centraal-Afrikaanse Republiek",
  CG: "Congo-Brazzaville",
  CH: "Zwitserland",
  CI: "Ivoorkust",
  CK: "Cookeilanden",
  CL: "Chili",
  CM: "Kameroen",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Kaapverdië",
  CW: "Curaçao",
  CX: "Christmaseiland",
  CY: "Cyprus",
  CZ: "Tsjechië",
  DE: "Duitsland",
  DJ: "Djibouti",
  DK: "Denemarken",
  DM: "Dominica",
  DO: "Dominicaanse Republiek",
  DZ: "Algerije",
  EC: "Ecuador",
  EE: "Estland",
  EG: "Egypte",
  EH: "Westelijke Sahara",
  ER: "Eritrea",
  ES: "Spanje",
  ET: "Ethiopië",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falklandeilanden",
  FM: "Micronesië",
  FO: "Faeröer",
  FR: "Frankrijk",
  GA: "Gabon",
  GB: "Verenigd Koninkrijk",
  GD: "Grenada",
  GE: "Georgië",
  GF: "Frans-Guyana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Groenland",
  GM: "Gambia",
  GN: "Guinee",
  GP: "Guadeloupe",
  GQ: "Equatoriaal-Guinea",
  GR: "Griekenland",
  GS: "Zuid-Georgia en de Zuidelijke Sandwicheilanden",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinee-Bissau",
  GY: "Guyana",
  HK: "Hongkong",
  HM: "Heard- en McDonaldeilanden",
  HN: "Honduras",
  HR: "Kroatië",
  HT: "Haïti",
  HU: "Hongarije",
  ID: "Indonesië",
  IE: "Ierland",
  IL: "Israël",
  IM: "Isle of Man",
  IN: "India",
  IO: "Brits Indische Oceaanterritorium",
  IQ: "Irak",
  IR: "Iran",
  IS: "IJsland",
  IT: "Italië",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordanië",
  JP: "Japan",
  KE: "Kenia",
  KG: "Kirgizië",
  KH: "Cambodja",
  KI: "Kiribati",
  KM: "Comoren",
  KN: "Saint Kitts en Nevis",
  KP: "Noord-Korea",
  KR: "Zuid-Korea",
  KW: "Koeweit",
  KY: "Caymaneilanden",
  KZ: "Kazachstan",
  LA: "Laos",
  LB: "Libanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Litouwen",
  LU: "Luxemburg",
  LV: "Letland",
  LY: "Libië",
  MA: "Marokko",
  MC: "Monaco",
  MD: "Moldavië",
  ME: "Montenegro",
  MF: "Saint-Martin",
  MG: "Madagaskar",
  MH: "Marshalleilanden",
  MK: "Noord-Macedonië",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolië",
  MO: "Macau",
  MP: "Noordelijke Marianen",
  MQ: "Martinique",
  MR: "Mauritanië",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldiven",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Maleisië",
  MZ: "Mozambique",
  NA: "Namibië",
  NC: "Nieuw-Caledonië",
  NE: "Niger",
  NF: "Norfolkeiland",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Nederland",
  NO: "Noorwegen",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "Nieuw-Zeeland",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "Frans-Polynesië",
  PG: "Papoea-Nieuw-Guinea",
  PH: "Filipijnen",
  PK: "Pakistan",
  PL: "Polen",
  PM: "Saint-Pierre en Miquelon",
  PN: "Pitcairneilanden",
  PR: "Puerto Rico",
  PS: "Palestina",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Roemenië",
  RS: "Serbië",
  RU: "Rusland",
  RW: "Rwanda",
  SA: "Saoedi-Arabië",
  SB: "Salomonseilanden",
  SC: "Seychellen",
  SD: "Soedan",
  SE: "Zweden",
  SG: "Singapore",
  SH: "Sint-Helena",
  SI: "Slovenië",
  SJ: "Svalbard en Jan Mayen",
  SK: "Slowakije",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalië",
  SR: "Suriname",
  SS: "Zuid-Soedan",
  ST: "Sao Tomé en Principe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syrië",
  SZ: "Eswatini",
  TC: "Turks- en Caicoseilanden",
  TD: "Tsjaad",
  TF: "Franse Zuidelijke en Antarctische Gebieden",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tadzjikistan",
  TK: "Tokelau",
  TL: "Oost-Timor",
  TM: "Turkmenistan",
  TN: "Tunesië",
  TO: "Tonga",
  TR: "Turkije",
  TT: "Trinidad en Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Oekraïne",
  UG: "Oeganda",
  US: "Verenigde Staten",
  UY: "Uruguay",
  UZ: "Oezbekistan",
  VA: "Vaticaanstad",
  VC: "Saint Vincent en de Grenadines",
  VE: "Venezuela",
  VG: "Britse Maagdeneilanden",
  VI: "Amerikaanse Maagdeneilanden",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis en Futuna",
  WS: "Samoa",
  YE: "Jemen",
  YT: "Mayotte",
  ZA: "Zuid-Afrika",
  ZM: "Zambia",
  ZW: "Zimbabwe",
  WO: "Internationale registratie",
  WW: "Wereldwijd",
  EU: "Europese Unie",
  BX: "Benelux",
  UK: "Verenigd Koninkrijk",
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

// `landen` komt bij voorkeur van de beheerder-bewerkbare `landcodes`-tabel
// (zie src/lib/landen.ts); zonder dat argument valt dit terug op de statische
// lijst hierboven (die overigens ook de seed-data voor die tabel is).
export function landNaamVoorIso(iso: string | null, landen?: Record<string, { nl: string; en: string }>): string {
  if (!iso) return "—";
  if (landen?.[iso]) return landen[iso].nl;
  return LANDNAMEN[iso] ?? iso;
}
