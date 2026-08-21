import { landNaamVoorIso, typeDienstLabel } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABELS = {
  nl: {
    titel: "Specificatie maandfactuur",
    periode: "Periode",
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
    periode: "Period",
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

export type FactuurSpecificatieKlant = {
  naam: string;
  adres: string | null;
  specificatietaal: "nl" | "en";
  kolom_matter_type_land_zichtbaar: boolean;
  kolom_persoon_zichtbaar: boolean;
  kolom_uren_zichtbaar: boolean;
  kolom_tarief_zichtbaar: boolean;
  kolom_externe_kosten_zichtbaar: boolean;
  kolom_korting_zichtbaar: boolean;
};

export type FactuurSpecificatieItem = {
  id: string;
  datum: string;
  omschrijving_klant: string;
  eenheidstype: string;
  qty: number;
  tarief: number | null;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  medewerkerNaam: string | null;
  dossiers: { dossiernummer: string; type_dienst: string | null; land: string | null; matter_naam: string | null; volgorde: number }[];
};

export type FactuurSpecificatieTotalen = {
  totaal_honorarium: number;
  totaal_externe_kosten: number;
  totaal_korting: number;
  totaal_kantoorkosten: number;
  extra_korting: number;
  totaal_bedrag: number;
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

export function FactuurSpecificatie({
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
}) {
  const taal = klant.specificatietaal;
  const t = LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);

  const totaalExBtw = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-[#f1ece0] px-5 py-4">
        <p className="text-base font-medium">
          {klant.naam} <span className="text-muted-foreground">| {t.titel}</span>
        </p>
        <p className="text-lg font-bold tracking-wide">KNIJFF</p>
      </div>
      <p className="text-sm font-semibold">{formatMaandJaar(periodeStart, periodeEind, taal)}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.datum}</TableHead>
            <TableHead>{t.knijffRef}</TableHead>
            <TableHead>{t.matter}</TableHead>
            {klant.kolom_matter_type_land_zichtbaar && (
              <>
                <TableHead>{t.matterType}</TableHead>
                <TableHead>{t.land}</TableHead>
              </>
            )}
            <TableHead>{t.omschrijving}</TableHead>
            {klant.kolom_uren_zichtbaar && <TableHead className="text-right">{t.aantal}</TableHead>}
            {klant.kolom_tarief_zichtbaar && <TableHead className="text-right">{t.tarief}</TableHead>}
            {klant.kolom_externe_kosten_zichtbaar && <TableHead className="text-right">{t.kostenVanDerden}</TableHead>}
            {klant.kolom_korting_zichtbaar && <TableHead className="text-right">{t.korting}</TableHead>}
            <TableHead className="text-right">{t.totaalExBtw}</TableHead>
          </TableRow>
          <TableRow>
            <TableCell colSpan={klant.kolom_matter_type_land_zichtbaar ? 5 : 3} />
            <TableCell />
            {klant.kolom_uren_zichtbaar && <TableCell />}
            {klant.kolom_tarief_zichtbaar && <TableCell />}
            {klant.kolom_externe_kosten_zichtbaar && <TableCell />}
            {klant.kolom_korting_zichtbaar && (
              <TableCell className="text-right text-sm font-semibold italic tabular-figures">
                {euro(totalen.totaal_korting)}
              </TableCell>
            )}
            <TableCell className="text-right text-sm font-semibold italic tabular-figures">{euro(totaalExBtw)}</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
            const eerste = dossiers[0];
            const matterNamen = Array.from(new Set(dossiers.map((d) => d.matter_naam ?? "—")));
            return (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap">{formatDatum(item.datum, taal)}</TableCell>
                <TableCell className="whitespace-nowrap">{dossiers.map((d) => d.dossiernummer).join("; ")}</TableCell>
                <TableCell>{matterNamen.join(", ")}</TableCell>
                {klant.kolom_matter_type_land_zichtbaar && (
                  <>
                    <TableCell>{typeDienstLabel(eerste?.type_dienst ?? null, taal)}</TableCell>
                    <TableCell>{landNaamVoorIso(eerste?.land ?? null, landen)}</TableCell>
                  </>
                )}
                <TableCell className="whitespace-normal break-words">{item.omschrijving_klant}</TableCell>
                {klant.kolom_uren_zichtbaar && (
                  <TableCell className="text-right tabular-figures">{item.qty}</TableCell>
                )}
                {klant.kolom_tarief_zichtbaar && (
                  <TableCell className="text-right tabular-figures">{item.tarief !== null ? euro(item.tarief) : "—"}</TableCell>
                )}
                {klant.kolom_externe_kosten_zichtbaar && (
                  <TableCell className="text-right tabular-figures">{euro(item.externe_kosten)}</TableCell>
                )}
                {klant.kolom_korting_zichtbaar && (
                  <TableCell className="text-right tabular-figures">{euro(item.korting)}</TableCell>
                )}
                <TableCell className="text-right tabular-figures">
                  {euro(item.honorarium + item.externe_kosten - item.korting)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
