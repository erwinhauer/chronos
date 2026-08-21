// Server-only: PDF-opmaak van de factuur (cover, portrait) en de specificatie
// (itemized, landscape), gerenderd met @react-pdf/renderer (geen headless
// browser nodig, werkt in een server action). Zelfde databron als de
// HTML-weergave (src/components/factuur-cover.tsx / factuur-specificatie.tsx),
// maar met react-pdf's eigen primitives — die twee kunnen geen component delen.

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { landNaamVoorIso, typeDienstLabel } from "@/lib/dossiernummer";
import { KNIJFF_KANTOOR } from "@/lib/knijff-kantoorgegevens";
import type { LandenMap } from "@/lib/landen";
import type {
  FactuurSpecificatieItem,
  FactuurSpecificatieKlant,
  FactuurSpecificatieTotalen,
} from "@/components/factuur-specificatie";

const COVER_LABELS = {
  nl: {
    debiteurNr: "Debiteur Nr.",
    factuurLabel: "Factuur",
    onzeRef: "Onze ref.",
    uwRef: "Uw ref.",
    honorarium: "Honorarium",
    kostenVanDerden: "Kosten van derden",
    korting: "Korting",
    kantoorkosten: "Kantoorkosten",
    extraKorting: "Extra korting",
    subTotaal: "Sub Totaal",
    btw: "B.T.W.",
    totaalIn: "TOTAAL IN",
    betalingstermijn:
      "Graag zien wij betaling binnen 30 dagen tegemoet onder vermelding van notanummer en debiteurnummer.",
  },
  en: {
    debiteurNr: "Debtor No.",
    factuurLabel: "Invoice",
    onzeRef: "Our ref.",
    uwRef: "Your ref.",
    honorarium: "Fee",
    kostenVanDerden: "Disbursements",
    korting: "Discount",
    kantoorkosten: "Office costs",
    extraKorting: "Additional discount",
    subTotaal: "Sub Total",
    btw: "VAT",
    totaalIn: "TOTAL IN",
    betalingstermijn: "Kindly remit payment within 30 days, quoting the invoice and debtor number.",
  },
};

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
// Factuur (cover) — portrait, één samenvattende regel per totaalcategorie.
// ============================================================================

const coverStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#171b24" },
  logo: { fontSize: 16, fontWeight: 700, letterSpacing: 2 },
  logoSub: { fontSize: 8, color: "#5b6270", marginTop: 2 },
  blok: { marginTop: 20 },
  refBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#171b24",
    marginTop: 20,
    padding: 8,
  },
  refCel: { flex: 1 },
  refLabel: { fontSize: 8, fontWeight: 700, marginBottom: 2 },
  regelRij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalenBlok: { marginTop: 24, marginLeft: "auto", width: 220 },
  totalenRij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totaalRij: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#171b24",
    marginTop: 4,
    paddingTop: 4,
  },
  totaalLabel: { fontWeight: 700, fontSize: 11 },
  betaalBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#171b24",
    marginTop: 24,
  },
  betaalCel: { flex: 1, padding: 8 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#d9dbd5",
    marginTop: 20,
    paddingTop: 10,
    fontSize: 7,
    color: "#5b6270",
  },
});

export async function genereerFactuurCoverPdf({
  klant,
  project,
  valuta,
  periodeStart,
  periodeEind,
  totalen,
  btwPercentage,
  btwBedrag,
  btwVermelding,
  factuurnummer,
  factuurdatum,
  medewerkerInitialen,
}: {
  klant: { naam: string; adres: string | null; accountview_debiteurnummer: string | null; specificatietaal: "nl" | "en" };
  project: { naam: string; po_nummer: string | null } | null;
  valuta: string;
  periodeStart: string;
  periodeEind: string;
  totalen: FactuurSpecificatieTotalen;
  btwPercentage: number;
  btwBedrag: number;
  btwVermelding: string | null;
  factuurnummer?: string | null;
  factuurdatum?: string | null;
  medewerkerInitialen?: string | null;
}): Promise<Buffer> {
  const taal = klant.specificatietaal;
  const t = COVER_LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);

  const regels = [
    { label: `${t.honorarium} – ${formatMaandJaar(periodeStart, periodeEind, taal)}`, bedrag: totalen.totaal_honorarium },
    ...(totalen.totaal_externe_kosten > 0 ? [{ label: t.kostenVanDerden, bedrag: totalen.totaal_externe_kosten }] : []),
    ...(totalen.totaal_korting > 0 ? [{ label: t.korting, bedrag: -totalen.totaal_korting }] : []),
    ...(totalen.totaal_kantoorkosten > 0 ? [{ label: t.kantoorkosten, bedrag: totalen.totaal_kantoorkosten }] : []),
    ...(totalen.extra_korting > 0 ? [{ label: t.extraKorting, bedrag: -totalen.extra_korting }] : []),
  ];
  const subTotaal = totalen.totaal_bedrag;
  const totaalMetBtw = subTotaal + btwBedrag;

  const document = (
    <Document>
      <Page size="A4" style={coverStyles.page}>
        <View>
          <Text style={coverStyles.logo}>K N I J F F</Text>
          <Text style={coverStyles.logoSub}>Trademark Attorneys</Text>
        </View>

        <View style={coverStyles.blok}>
          <Text>{klant.naam}</Text>
          {klant.adres && <Text>{klant.adres}</Text>}
        </View>

        <View style={coverStyles.blok}>
          <Text>
            {KNIJFF_KANTOOR.stad}, {formatDatum(factuurdatum ?? new Date().toISOString(), taal)}
          </Text>
          <Text>
            {t.factuurLabel}: {factuurnummer ?? "—"}
          </Text>
          <Text>
            {t.debiteurNr}: {klant.accountview_debiteurnummer ?? "—"}
          </Text>
        </View>

        <View style={coverStyles.refBox}>
          <View style={coverStyles.refCel}>
            <Text style={coverStyles.refLabel}>{t.onzeRef}</Text>
            <Text>{project?.naam ?? "—"}</Text>
          </View>
          <View style={coverStyles.refCel}>
            <Text style={coverStyles.refLabel}>{t.uwRef}</Text>
            <Text>{project?.po_nummer ? `PO ${project.po_nummer}` : "—"}</Text>
          </View>
          <View style={[coverStyles.refCel, { flex: 0.4, textAlign: "right" }]}>
            <Text style={{ fontWeight: 700 }}>{valuta}</Text>
          </View>
        </View>

        <View style={coverStyles.blok}>
          {regels.map((regel) => (
            <View key={regel.label} style={coverStyles.regelRij}>
              <Text>{regel.label}</Text>
              <Text>{euro(regel.bedrag)}</Text>
            </View>
          ))}
        </View>

        <View style={coverStyles.totalenBlok}>
          <View style={coverStyles.totalenRij}>
            <Text>{t.subTotaal}</Text>
            <Text>{euro(subTotaal)}</Text>
          </View>
          <View style={coverStyles.totalenRij}>
            <Text>
              {t.btw} {btwPercentage}%
            </Text>
            <Text>{euro(btwBedrag)}</Text>
          </View>
          <View style={coverStyles.totaalRij}>
            <Text style={coverStyles.totaalLabel}>
              {t.totaalIn} {valuta}
            </Text>
            <Text style={coverStyles.totaalLabel}>{euro(totaalMetBtw)}</Text>
          </View>
          {btwVermelding && <Text style={{ marginTop: 4, fontSize: 7, color: "#5b6270" }}>{btwVermelding}</Text>}
        </View>

        {medewerkerInitialen && <Text style={{ marginTop: 16, fontSize: 8 }}>{medewerkerInitialen}/</Text>}

        <View style={coverStyles.betaalBox}>
          <View style={[coverStyles.betaalCel, { borderRightWidth: 1, borderRightColor: "#171b24" }]}>
            <Text style={{ fontWeight: 700 }}>IBAN: {KNIJFF_KANTOOR.iban}</Text>
          </View>
          <View style={coverStyles.betaalCel}>
            <Text style={{ fontWeight: 700 }}>{t.betalingstermijn}</Text>
          </View>
        </View>

        <View style={coverStyles.footer}>
          <View>
            <Text style={{ fontWeight: 700, color: "#171b24" }}>{KNIJFF_KANTOOR.naam}</Text>
            <Text>{KNIJFF_KANTOOR.straat}</Text>
            <Text>
              {KNIJFF_KANTOOR.postcodePlaats} | {KNIJFF_KANTOOR.land}
            </Text>
          </View>
          <View>
            <Text>{KNIJFF_KANTOOR.telefoon}</Text>
            <Text>{KNIJFF_KANTOOR.email}</Text>
            <Text>{KNIJFF_KANTOOR.website}</Text>
          </View>
          <View>
            <Text>btw/vat {KNIJFF_KANTOOR.btwNummer}</Text>
            <Text>kvk {KNIJFF_KANTOOR.kvkNummer}</Text>
            <Text>
              iban {KNIJFF_KANTOOR.iban} | bic {KNIJFF_KANTOOR.bic}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
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
