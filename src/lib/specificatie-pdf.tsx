// Server-only: PDF-opmaak van de specificatie (itemized, landscape), gerenderd
// met @react-pdf/renderer (geen headless browser nodig, werkt in een server
// action). Zelfde databron als de HTML-weergave
// (src/components/factuur-specificatie.tsx), maar met react-pdf's eigen
// primitives — die twee kunnen geen component delen.

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { landNaamVoorIso, typeDienstLabel } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import type {
  FactuurSpecificatieItem,
  FactuurSpecificatieKlant,
  FactuurSpecificatieTotalen,
} from "@/components/factuur-specificatie";

const SPEC_LABELS = {
  nl: {
    titel: "Specificatie maandfactuur",
    datum: "Datum",
    knijffRef: "Knijff ref.",
    matter: "Matter",
    matterType: "Matter type",
    land: "Land",
    omschrijving: "Omschrijving",
    aantal: "Aantal",
    tarief: "Tarief",
    kostenVanDerden: "Kosten van derden",
    korting: "Korting",
    totaalExBtw: "Totaal (ex BTW)",
  },
  en: {
    titel: "Specification monthly invoice",
    datum: "Date",
    knijffRef: "Knijff ref.",
    matter: "Matter",
    matterType: "Matter type",
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

function formatMaandJaar(periodeStart: string, periodeEind: string, taal: "nl" | "en") {
  const start = new Date(periodeStart);
  const eind = new Date(periodeEind);
  const locale = taal === "nl" ? "nl-NL" : "en-GB";
  if (start.getFullYear() === eind.getFullYear() && start.getMonth() === eind.getMonth()) {
    const label = start.toLocaleDateString(locale, { month: "long", year: "numeric" });
    return taal === "nl" ? label : label.charAt(0).toUpperCase() + label.slice(1);
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
    backgroundColor: "#f1ece0",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  kopTitel: { fontSize: 11 },
  kopLogo: { fontSize: 13, fontWeight: 700, letterSpacing: 2 },
  maandJaar: { fontSize: 9, fontWeight: 700, marginTop: 10, marginBottom: 6 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#171b24", paddingBottom: 4 },
  totalenRow: { flexDirection: "row", paddingTop: 3, paddingBottom: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d9dbd5", paddingVertical: 4 },
  th: { fontWeight: 700, fontSize: 7, color: "#5b6270" },
  cellRight: { textAlign: "right" },
  totaalCel: { fontWeight: 700, fontStyle: "italic", fontSize: 8 },
});

const KOLOM_GEWICHT: Record<string, number> = {
  datum: 7,
  ref: 9,
  matter: 14,
  matterType: 9,
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
  items,
  totalen,
  valuta,
  landen,
}: {
  klant: FactuurSpecificatieKlant;
  periodeStart: string;
  periodeEind: string;
  items: FactuurSpecificatieItem[];
  totalen: FactuurSpecificatieTotalen;
  valuta: string;
  landen?: LandenMap;
}): Promise<Buffer> {
  const taal = klant.specificatietaal;
  const t = SPEC_LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);
  const totaalExBtw = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;

  const kolommen: { key: string; label: string; rechts?: boolean }[] = [
    { key: "datum", label: t.datum },
    { key: "ref", label: t.knijffRef },
    { key: "matter", label: t.matter },
    ...(klant.kolom_matter_type_land_zichtbaar
      ? [
          { key: "matterType", label: t.matterType },
          { key: "land", label: t.land },
        ]
      : []),
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
        <Text style={specStyles.kopLogo}>KNIJFF</Text>
      </View>
      <Text style={specStyles.maandJaar}>{formatMaandJaar(periodeStart, periodeEind, taal)}</Text>
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
        {kopEnKoppen}
        {items.map((item) => {
          const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
          const eerste = dossiers[0];
          const matterNamen = Array.from(new Set(dossiers.map((d) => d.matter_naam ?? "—")));
          const waarden: Record<string, string> = {
            datum: formatDatum(item.datum, taal),
            ref: dossiers.map((d) => d.dossiernummer).join("; "),
            matter: matterNamen.join(", "),
            matterType: typeDienstLabel(eerste?.type_dienst ?? null, taal),
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
              {kolommen.map((k) => (
                <Text key={k.key} style={[{ width: breedte(k.key) }, k.rechts ? specStyles.cellRight : undefined]}>
                  {waarden[k.key]}
                </Text>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
