// Server-only: PDF-opmaak van een factuur/specificatie, gerenderd met
// @react-pdf/renderer (geen headless browser nodig, werkt in een server action).
// Zelfde databron als src/components/factuur-specificatie.tsx (de HTML-weergave),
// maar met react-pdf's eigen primitives — die twee kunnen geen component delen.

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import type {
  FactuurSpecificatieItem,
  FactuurSpecificatieKlant,
  FactuurSpecificatieTotalen,
} from "@/components/factuur-specificatie";

const LABELS = {
  nl: {
    titel: "Specificatie",
    periode: "Periode",
    datum: "Datum",
    dossier: "Dossier",
    medewerker: "Medewerker",
    omschrijving: "Omschrijving",
    aantal: "Aantal",
    tarief: "Tarief",
    honorarium: "Honorarium",
    kostenVanDerden: "Kosten van derden",
    korting: "Korting",
    extraKorting: "Extra korting",
    subtotaal: "Subtotaal",
    kantoorkosten: "Kantoorkosten",
    totaal: "Totaal",
  },
  en: {
    titel: "Fee Note",
    periode: "Period",
    datum: "Date",
    dossier: "Matter",
    medewerker: "Fee earner",
    omschrijving: "Description",
    aantal: "Quantity",
    tarief: "Rate",
    honorarium: "Fee",
    kostenVanDerden: "Disbursements",
    korting: "Discount",
    extraKorting: "Additional discount",
    subtotaal: "Subtotal",
    kantoorkosten: "Office costs",
    totaal: "Total",
  },
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#171b24" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  klantNaam: { fontSize: 13, fontWeight: 700 },
  metaBlok: { textAlign: "right" },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#171b24", paddingBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d9dbd5", paddingVertical: 4 },
  th: { fontWeight: 700, fontSize: 8, textTransform: "uppercase", color: "#5b6270" },
  cellRight: { textAlign: "right" },
  totalenBlok: { marginTop: 16, marginLeft: "auto", width: 220 },
  totalenRij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalenLabel: { color: "#5b6270" },
  totaalRij: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#171b24", marginTop: 4, paddingTop: 4 },
  totaalLabel: { fontWeight: 700, fontSize: 11 },
});

function formatDatum(datum: string, taal: "nl" | "en") {
  return new Date(datum).toLocaleDateString(taal === "nl" ? "nl-NL" : "en-GB");
}

function kolomBreedte(kolom: string) {
  const breedtes: Record<string, number> = {
    datum: 0.1,
    dossier: 0.2,
    medewerker: 0.13,
    omschrijving: 0.27,
    aantal: 0.1,
    tarief: 0.1,
    honorarium: 0.1,
    kostenVanDerden: 0.1,
    korting: 0.1,
  };
  return breedtes[kolom] ?? 0.1;
}

export async function genereerFactuurPdf({
  klant,
  project,
  valuta,
  factuurnummer,
  periodeStart,
  periodeEind,
  items,
  totalen,
}: {
  klant: FactuurSpecificatieKlant;
  project: { naam: string; po_nummer: string | null } | null;
  valuta: string;
  factuurnummer?: string | null;
  periodeStart: string;
  periodeEind: string;
  items: FactuurSpecificatieItem[];
  totalen: FactuurSpecificatieTotalen;
}): Promise<Buffer> {
  const taal = klant.specificatietaal;
  const t = LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);
  const subtotaal = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;

  const kolommen: { key: string; label: string; rechts?: boolean }[] = [
    { key: "datum", label: t.datum },
    ...(klant.kolom_matter_type_land_zichtbaar ? [{ key: "dossier", label: t.dossier }] : []),
    ...(klant.kolom_persoon_zichtbaar ? [{ key: "medewerker", label: t.medewerker }] : []),
    { key: "omschrijving", label: t.omschrijving },
    ...(klant.kolom_uren_zichtbaar ? [{ key: "aantal", label: t.aantal }] : []),
    ...(klant.kolom_tarief_zichtbaar ? [{ key: "tarief", label: t.tarief, rechts: true }] : []),
    { key: "honorarium", label: t.honorarium, rechts: true },
    ...(klant.kolom_externe_kosten_zichtbaar ? [{ key: "kostenVanDerden", label: t.kostenVanDerden, rechts: true }] : []),
    ...(klant.kolom_korting_zichtbaar ? [{ key: "korting", label: t.korting, rechts: true }] : []),
  ];

  const document = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.klantNaam}>{klant.naam}</Text>
            {klant.adres && <Text>{klant.adres}</Text>}
          </View>
          <View style={styles.metaBlok}>
            <Text>{t.titel}</Text>
            {factuurnummer && <Text>{factuurnummer}</Text>}
            {project && <Text>{project.naam}</Text>}
            {project?.po_nummer && <Text>PO: {project.po_nummer}</Text>}
            <Text>
              {t.periode}: {formatDatum(periodeStart, taal)} – {formatDatum(periodeEind, taal)}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeaderRow}>
          {kolommen.map((k) => (
            <Text key={k.key} style={[styles.th, { width: `${kolomBreedte(k.key) * 100}%` }, k.rechts ? styles.cellRight : undefined]}>
              {k.label}
            </Text>
          ))}
        </View>

        {items.map((item) => {
          const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
          const dossierTekst = dossiers
            .map((d) => `${d.dossiernummer} · ${d.type_dienst}${d.land ? ` · ${landNaamVoorIso(d.land)}` : ""}`)
            .join("\n");
          const waarden: Record<string, string> = {
            datum: formatDatum(item.datum, taal),
            dossier: dossierTekst,
            medewerker: item.medewerkerNaam ?? "",
            omschrijving: item.omschrijving_klant,
            aantal: `${item.qty} ${item.eenheidstype}`,
            tarief: item.tarief !== null ? euro(item.tarief) : "—",
            honorarium: euro(item.honorarium),
            kostenVanDerden: euro(item.externe_kosten),
            korting: `-${euro(item.korting)}`,
          };
          return (
            <View key={item.id} style={styles.tableRow}>
              {kolommen.map((k) => (
                <Text key={k.key} style={[{ width: `${kolomBreedte(k.key) * 100}%` }, k.rechts ? styles.cellRight : undefined]}>
                  {waarden[k.key]}
                </Text>
              ))}
            </View>
          );
        })}

        <View style={styles.totalenBlok}>
          <View style={styles.totalenRij}>
            <Text style={styles.totalenLabel}>{t.honorarium}</Text>
            <Text>{euro(totalen.totaal_honorarium)}</Text>
          </View>
          {totalen.totaal_externe_kosten > 0 && (
            <View style={styles.totalenRij}>
              <Text style={styles.totalenLabel}>{t.kostenVanDerden}</Text>
              <Text>{euro(totalen.totaal_externe_kosten)}</Text>
            </View>
          )}
          {totalen.totaal_korting > 0 && (
            <View style={styles.totalenRij}>
              <Text style={styles.totalenLabel}>{t.korting}</Text>
              <Text>-{euro(totalen.totaal_korting)}</Text>
            </View>
          )}
          <View style={styles.totalenRij}>
            <Text style={styles.totalenLabel}>{t.subtotaal}</Text>
            <Text>{euro(subtotaal)}</Text>
          </View>
          <View style={styles.totalenRij}>
            <Text style={styles.totalenLabel}>{t.kantoorkosten}</Text>
            <Text>{euro(totalen.totaal_kantoorkosten)}</Text>
          </View>
          {totalen.extra_korting > 0 && (
            <View style={styles.totalenRij}>
              <Text style={styles.totalenLabel}>{t.extraKorting}</Text>
              <Text>-{euro(totalen.extra_korting)}</Text>
            </View>
          )}
          <View style={styles.totaalRij}>
            <Text style={styles.totaalLabel}>{t.totaal}</Text>
            <Text style={styles.totaalLabel}>{euro(totalen.totaal_bedrag)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
