// Server-only: PDF-opmaak van de specificatie (itemized, landscape), gerenderd
// met @react-pdf/renderer (geen headless browser nodig, werkt in een server
// action). Zelfde databron als de HTML-weergave
// (src/components/factuur-specificatie.tsx), maar met react-pdf's eigen
// primitives — die twee kunnen geen component delen.

import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import type {
  FactuurSpecificatieItem,
  FactuurSpecificatieKlant,
  FactuurSpecificatieTotalen,
} from "@/components/factuur-specificatie";

const LOGO_PATH = path.join(process.cwd(), "public", "knijff-logo-dark-navy.png");

const SPEC_LABELS = {
  nl: {
    titel: "Specificatie factuur",
    datum: "Datum",
    aangemaaktOp: "Datum specificatie",
    knijffRefMatter: "Knijff ref. / Matter",
    land: "Land",
    omschrijving: "Omschrijving",
    aantal: "Aantal",
    tarief: "Tarief",
    kostenVanDerden: "Kosten van derden",
    korting: "Korting",
    totaalExBtw: "Totaal (ex BTW)",
  },
  en: {
    titel: "Specification invoice",
    datum: "Date",
    aangemaaktOp: "Specification date",
    knijffRefMatter: "Knijff ref. / Matter",
    land: "Country",
    omschrijving: "Description",
    aantal: "Qty",
    tarief: "Fee",
    kostenVanDerden: "External Fee",
    korting: "Discount",
    totaalExBtw: "Total (ex VAT)",
  },
};

function formatDatum(datum: string, taal: "nl" | "en") {
  return new Date(datum).toLocaleDateString(taal === "nl" ? "nl-NL" : "en-GB");
}

function capitaliseer(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMaandJaar(periodeStart: string, periodeEind: string, taal: "nl" | "en") {
  const start = new Date(periodeStart);
  const eind = new Date(periodeEind);
  const locale = taal === "nl" ? "nl-NL" : "en-GB";
  if (start.getFullYear() === eind.getFullYear() && start.getMonth() === eind.getMonth()) {
    return capitaliseer(start.toLocaleDateString(locale, { month: "long", year: "numeric" }));
  }
  return `${formatDatum(periodeStart, taal)} – ${formatDatum(periodeEind, taal)}`;
}

// ============================================================================
// Specificatie — landscape, itemized, kopregel + kolomkoppen herhalen per pagina.
// ============================================================================

const specStyles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica", color: "#171b24" },
  kopBalk: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  kopTitel: { fontSize: 11 },
  kopLogo: { height: 20, width: 50.5 },
  maandJaar: { fontSize: 9, fontWeight: 700, marginTop: 10 },
  aangemaaktOp: { fontSize: 7, color: "#5b6270", marginBottom: 6 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#171b24", paddingBottom: 4 },
  totalenRow: { flexDirection: "row", paddingTop: 3, paddingBottom: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d9dbd5", paddingVertical: 4 },
  th: { fontWeight: 700, fontSize: 7, color: "#5b6270" },
  cellRight: { textAlign: "right" },
  cellSub: { color: "#5b6270", marginTop: 1 },
  totaalCel: { fontWeight: 700, fontStyle: "italic", fontSize: 8 },
  watermerk: {
    position: "absolute",
    top: "40%",
    left: "22%",
    fontSize: 90,
    fontWeight: 700,
    color: "#0f053a",
    opacity: 0.07,
    transform: "rotate(-30deg)",
  },
});

const KOLOM_GEWICHT: Record<string, number> = {
  datum: 7,
  refMatter: 20,
  land: 9,
  omschrijving: 28,
  aantal: 4,
  tarief: 6,
  kostenVanDerden: 6,
  korting: 6,
  totaal: 7,
};

export async function genereerSpecificatiePdf({
  klant,
  periodeStart,
  periodeEind,
  aangemaaktOp,
  items,
  totalen,
  valuta,
  landen,
  watermerk,
}: {
  klant: FactuurSpecificatieKlant;
  periodeStart: string;
  periodeEind: string;
  aangemaaktOp: string;
  items: FactuurSpecificatieItem[];
  totalen: FactuurSpecificatieTotalen;
  valuta: string;
  landen?: LandenMap;
  watermerk?: string;
}): Promise<Buffer> {
  const taal = klant.specificatietaal;
  const t = SPEC_LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);
  const totaalExBtw = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;

  const kolommen: { key: string; label: string; rechts?: boolean }[] = [
    { key: "datum", label: t.datum },
    { key: "refMatter", label: t.knijffRefMatter },
    ...(klant.kolom_matter_type_land_zichtbaar ? [{ key: "land", label: t.land }] : []),
    { key: "omschrijving", label: t.omschrijving },
    ...(klant.kolom_uren_zichtbaar ? [{ key: "aantal", label: t.aantal, rechts: true }] : []),
    ...(klant.kolom_tarief_zichtbaar ? [{ key: "tarief", label: t.tarief, rechts: true }] : []),
    ...(klant.kolom_externe_kosten_zichtbaar
      ? [{ key: "kostenVanDerden", label: t.kostenVanDerden, rechts: true }]
      : []),
    ...(klant.kolom_korting_zichtbaar ? [{ key: "korting", label: t.korting, rechts: true }] : []),
    { key: "totaal", label: t.totaalExBtw, rechts: true },
  ];
  const totaalGewicht = kolommen.reduce((som, k) => som + (KOLOM_GEWICHT[k.key] ?? 8), 0);
  const breedte = (key: string) => `${((KOLOM_GEWICHT[key] ?? 8) / totaalGewicht) * 100}%`;

  const kopEnKoppen = (
    <View fixed>
      <View style={specStyles.kopBalk}>
        <Text style={specStyles.kopTitel}>
          {klant.naam} | {t.titel}
        </Text>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not a DOM <img>; no alt prop exists */}
        <Image src={LOGO_PATH} style={specStyles.kopLogo} />
      </View>
      <Text style={specStyles.maandJaar}>{formatMaandJaar(periodeStart, periodeEind, taal)}</Text>
      <Text style={specStyles.aangemaaktOp}>
        {t.aangemaaktOp}: {formatDatum(aangemaaktOp, taal)}
      </Text>
      <View style={specStyles.tableHeaderRow}>
        {kolommen.map((k) => (
          <Text key={k.key} style={[specStyles.th, { width: breedte(k.key) }, k.rechts ? specStyles.cellRight : undefined]}>
            {k.label}
          </Text>
        ))}
      </View>
      <View style={specStyles.totalenRow}>
        {kolommen.map((k) => {
          if (k.key === "korting" && klant.kolom_korting_zichtbaar) {
            return (
              <Text key={k.key} style={[specStyles.totaalCel, specStyles.cellRight, { width: breedte(k.key) }]}>
                {euro(totalen.totaal_korting)}
              </Text>
            );
          }
          if (k.key === "totaal") {
            return (
              <Text key={k.key} style={[specStyles.totaalCel, specStyles.cellRight, { width: breedte(k.key) }]}>
                {euro(totaalExBtw)}
              </Text>
            );
          }
          return <Text key={k.key} style={{ width: breedte(k.key) }} />;
        })}
      </View>
    </View>
  );

  return renderToBuffer(
    <Document>
      <Page size="A4" orientation="landscape" style={specStyles.page}>
        {watermerk && <Text fixed style={specStyles.watermerk}>{watermerk}</Text>}
        {kopEnKoppen}
        {items.map((item) => {
          const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
          const eerste = dossiers[0];
          const matterNamen = Array.from(new Set(dossiers.map((d) => d.matter_naam ?? "—")));
          const waarden: Record<string, string> = {
            datum: formatDatum(item.datum, taal),
            land: landNaamVoorIso(eerste?.land ?? null, landen),
            omschrijving: item.omschrijving_klant,
            aantal: `${item.qty}`,
            tarief: item.tarief !== null ? euro(item.tarief) : "—",
            kostenVanDerden: euro(item.externe_kosten),
            korting: euro(item.korting),
            totaal: euro(item.honorarium + item.externe_kosten - item.korting),
          };
          return (
            <View key={item.id} style={specStyles.tableRow}>
              {kolommen.map((k) => {
                if (k.key === "refMatter") {
                  return (
                    <View key={k.key} style={{ width: breedte(k.key) }}>
                      <Text>{dossiers.map((d) => d.dossiernummer).join("; ")}</Text>
                      <Text style={specStyles.cellSub}>{matterNamen.join(", ")}</Text>
                    </View>
                  );
                }
                return (
                  <Text key={k.key} style={[{ width: breedte(k.key) }, k.rechts ? specStyles.cellRight : undefined]}>
                    {waarden[k.key]}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
