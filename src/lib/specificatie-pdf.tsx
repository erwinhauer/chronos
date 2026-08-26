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
    aangemaaktOp: "Specificatiedatum",
    opgesteldDoor: "Opgesteld door",
    knijffRefMatter: "Knijff ref. / Matter",
    land: "Land",
    omschrijving: "Omschrijving",
    aantal: "Aantal",
    tarief: "Tarief",
    kostenVanDerden: "Kosten van derden",
    korting: "Korting",
    totaalExBtw: "Totaal (ex BTW)",
    subtotaal: "Subtotaal",
    kantoorkosten: "Kantoorkosten",
    extraKorting: "Extra korting",
    totaal: "Totaal",
  },
  en: {
    titel: "Specification invoice",
    datum: "Date",
    aangemaaktOp: "Specification date",
    opgesteldDoor: "Prepared by",
    knijffRefMatter: "Knijff ref. / Matter",
    land: "Country",
    omschrijving: "Description",
    aantal: "Qty",
    tarief: "Fee",
    kostenVanDerden: "External Fee",
    korting: "Discount",
    totaalExBtw: "Total (ex VAT)",
    subtotaal: "Subtotal",
    kantoorkosten: "Office costs",
    extraKorting: "Additional discount",
    totaal: "Total",
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

// "PO-nummer and/or Project name" — toont wat er is, gecombineerd als beide er zijn.
function poEnProjectRegel(project?: { naam: string; po_nummer: string | null } | null): string | null {
  if (!project) return null;
  const delen: string[] = [];
  if (project.naam) delen.push(project.naam);
  if (project.po_nummer) delen.push(`PO ${project.po_nummer}`);
  return delen.length > 0 ? delen.join(" - ") : null;
}

// ============================================================================
// Specificatie — landscape, itemized, kopregel + kolomkoppen herhalen per pagina.
// ============================================================================

const specStyles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 36, fontSize: 8, fontFamily: "Helvetica", color: "#171b24" },
  kopBalk: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
  },
  kopH1: { fontSize: 17, fontWeight: 700 },
  kopH2: { fontSize: 12, fontWeight: 600, color: "#5b6270", marginTop: 3 },
  kopProjectRegel: { fontSize: 9, fontWeight: 700, marginTop: 6 },
  kopMeta: { marginTop: 8 },
  kopMaandJaar: { fontSize: 9, fontWeight: 700, marginBottom: 3 },
  kopMetaRegel: { fontSize: 7, color: "#5b6270", marginTop: 1 },
  kopLogo: { height: 34, width: 85.8, marginTop: 2 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#171b24", paddingBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d9dbd5", paddingVertical: 4 },
  th: { fontWeight: 700, fontSize: 7, color: "#5b6270" },
  cellRight: { textAlign: "right" },
  cellSub: { color: "#5b6270", marginTop: 1 },
  totalenBlok: { flexDirection: "column", alignSelf: "flex-end", width: 200, marginTop: 12 },
  totalenRij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalenLabel: { fontSize: 8, color: "#5b6270" },
  totalenWaarde: { fontSize: 8, color: "#5b6270" },
  totalenDivider: { borderTopWidth: 0.5, borderTopColor: "#171b24", marginVertical: 3 },
  totalenTotaalLabel: { fontSize: 9, fontWeight: 700 },
  totalenTotaalWaarde: { fontSize: 9, fontWeight: 700 },
  paginaVoetnoot: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: "#5b6270",
  },
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
  project,
  voorbereidDoor,
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
  project?: { naam: string; po_nummer: string | null } | null;
  voorbereidDoor: string;
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
  const euro = (n: number) => {
    const locale = taal === "nl" ? "nl-NL" : "en-GB";
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency: valuta }).formatToParts(n);
    return parts
      .map((p) => (p.type === "currency" ? `${p.value} ` : p.value))
      .join("")
      .replace(/ {2,}/g, " ");
  };
  const totaalExBtw = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;
  const toontKortingKolom = klant.kolom_korting_zichtbaar && items.some((i) => i.korting > 0);
  const projectRegel = poEnProjectRegel(project);

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
    ...(toontKortingKolom ? [{ key: "korting", label: t.korting, rechts: true }] : []),
    { key: "totaal", label: t.totaalExBtw, rechts: true },
  ];
  const totaalGewicht = kolommen.reduce((som, k) => som + (KOLOM_GEWICHT[k.key] ?? 8), 0);
  const breedte = (key: string) => `${((KOLOM_GEWICHT[key] ?? 8) / totaalGewicht) * 100}%`;

  const kopEnKoppen = (
    <View fixed>
      <View style={specStyles.kopBalk}>
        <View>
          <Text style={specStyles.kopH1}>{t.titel}</Text>
          <Text style={specStyles.kopH2}>{klant.naam}</Text>
          {projectRegel && <Text style={specStyles.kopProjectRegel}>{projectRegel}</Text>}
          <View style={specStyles.kopMeta}>
            <Text style={specStyles.kopMaandJaar}>{formatMaandJaar(periodeStart, periodeEind, taal)}</Text>
            <Text style={specStyles.kopMetaRegel}>
              {t.aangemaaktOp}: {formatDatum(aangemaaktOp, taal)}
            </Text>
            <Text style={specStyles.kopMetaRegel}>
              {t.opgesteldDoor}: {voorbereidDoor}
            </Text>
          </View>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not a DOM <img>; no alt prop exists */}
        <Image src={LOGO_PATH} style={specStyles.kopLogo} />
      </View>
      <View style={specStyles.tableHeaderRow}>
        {kolommen.map((k) => (
          <Text key={k.key} style={[specStyles.th, { width: breedte(k.key) }, k.rechts ? specStyles.cellRight : undefined]}>
            {k.label}
          </Text>
        ))}
      </View>
    </View>
  );

  const totalenBlok = (
    <View style={specStyles.totalenBlok}>
      {toontKortingKolom && totalen.totaal_korting > 0 && (
        <View style={specStyles.totalenRij}>
          <Text style={specStyles.totalenLabel}>{t.korting}</Text>
          <Text style={specStyles.totalenWaarde}>- {euro(totalen.totaal_korting)}</Text>
        </View>
      )}
      <View style={specStyles.totalenRij}>
        <Text style={specStyles.totalenLabel}>{t.subtotaal}</Text>
        <Text style={specStyles.totalenWaarde}>{euro(totaalExBtw)}</Text>
      </View>
      {totalen.totaal_kantoorkosten > 0 && (
        <View style={specStyles.totalenRij}>
          <Text style={specStyles.totalenLabel}>{t.kantoorkosten}</Text>
          <Text style={specStyles.totalenWaarde}>{euro(totalen.totaal_kantoorkosten)}</Text>
        </View>
      )}
      {totalen.extra_korting > 0 && (
        <View style={specStyles.totalenRij}>
          <Text style={specStyles.totalenLabel}>{t.extraKorting}</Text>
          <Text style={specStyles.totalenWaarde}>- {euro(totalen.extra_korting)}</Text>
        </View>
      )}
      <View style={specStyles.totalenDivider} />
      <View style={specStyles.totalenRij}>
        <Text style={specStyles.totalenTotaalLabel}>{t.totaal}</Text>
        <Text style={specStyles.totalenTotaalWaarde}>{euro(totalen.totaal_bedrag)}</Text>
      </View>
    </View>
  );

  return renderToBuffer(
    <Document>
      <Page size="A4" orientation="landscape" style={specStyles.page}>
        {watermerk && <Text fixed style={specStyles.watermerk}>{watermerk}</Text>}
        <Text
          fixed
          style={specStyles.paginaVoetnoot}
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
        />
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
        {totalenBlok}
      </Page>
    </Document>
  );
}
