import { landNaamVoorIso } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  dossiers: { dossiernummer: string; type_dienst: string | null; land: string | null; volgorde: number }[];
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

export function FactuurSpecificatie({
  klant,
  project,
  valuta,
  factuurnummer,
  periodeStart,
  periodeEind,
  items,
  totalen,
  landen,
}: {
  klant: FactuurSpecificatieKlant;
  project: { naam: string; po_nummer: string | null } | null;
  valuta: string;
  factuurnummer?: string | null;
  periodeStart: string;
  periodeEind: string;
  items: FactuurSpecificatieItem[];
  totalen: FactuurSpecificatieTotalen;
  landen?: LandenMap;
}) {
  const taal = klant.specificatietaal;
  const t = LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: valuta }).format(n);

  const subtotaal = totalen.totaal_honorarium + totalen.totaal_externe_kosten - totalen.totaal_korting;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">{klant.naam}</p>
          {klant.adres && <p className="text-sm text-muted-foreground whitespace-pre-line">{klant.adres}</p>}
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t.titel}</p>
          {factuurnummer && <p>{factuurnummer}</p>}
          {project && <p>{project.naam}</p>}
          {project?.po_nummer && <p>PO: {project.po_nummer}</p>}
          <p>
            {t.periode}: {formatDatum(periodeStart, taal)} – {formatDatum(periodeEind, taal)}
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.datum}</TableHead>
            {klant.kolom_matter_type_land_zichtbaar && <TableHead>{t.dossier}</TableHead>}
            {klant.kolom_persoon_zichtbaar && <TableHead>{t.medewerker}</TableHead>}
            <TableHead>{t.omschrijving}</TableHead>
            {klant.kolom_uren_zichtbaar && <TableHead>{t.aantal}</TableHead>}
            {klant.kolom_tarief_zichtbaar && <TableHead>{t.tarief}</TableHead>}
            <TableHead className="text-right">{t.honorarium}</TableHead>
            {klant.kolom_externe_kosten_zichtbaar && <TableHead className="text-right">{t.kostenVanDerden}</TableHead>}
            {klant.kolom_korting_zichtbaar && <TableHead className="text-right">{t.korting}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const dossiers = item.dossiers.slice().sort((a, b) => a.volgorde - b.volgorde);
            return (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap">{formatDatum(item.datum, taal)}</TableCell>
                {klant.kolom_matter_type_land_zichtbaar && (
                  <TableCell>
                    {dossiers.map((d) => (
                      <div key={d.dossiernummer} className="text-xs">
                        <span className="font-medium">{d.dossiernummer}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {d.type_dienst}
                          {d.land ? ` · ${landNaamVoorIso(d.land, landen)}` : ""}
                        </span>
                      </div>
                    ))}
                  </TableCell>
                )}
                {klant.kolom_persoon_zichtbaar && <TableCell>{item.medewerkerNaam}</TableCell>}
                <TableCell>{item.omschrijving_klant}</TableCell>
                {klant.kolom_uren_zichtbaar && (
                  <TableCell className="tabular-figures">
                    {item.qty} {item.eenheidstype}
                  </TableCell>
                )}
                {klant.kolom_tarief_zichtbaar && (
                  <TableCell className="tabular-figures">{item.tarief !== null ? euro(item.tarief) : "—"}</TableCell>
                )}
                <TableCell className="text-right tabular-figures">{euro(item.honorarium)}</TableCell>
                {klant.kolom_externe_kosten_zichtbaar && (
                  <TableCell className="text-right tabular-figures">{euro(item.externe_kosten)}</TableCell>
                )}
                {klant.kolom_korting_zichtbaar && (
                  <TableCell className="text-right tabular-figures">-{euro(item.korting)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.honorarium}</span>
          <span className="tabular-figures">{euro(totalen.totaal_honorarium)}</span>
        </div>
        {totalen.totaal_externe_kosten > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.kostenVanDerden}</span>
            <span className="tabular-figures">{euro(totalen.totaal_externe_kosten)}</span>
          </div>
        )}
        {totalen.totaal_korting > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.korting}</span>
            <span className="tabular-figures">-{euro(totalen.totaal_korting)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.subtotaal}</span>
          <span className="tabular-figures">{euro(subtotaal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.kantoorkosten}</span>
          <span className="tabular-figures">{euro(totalen.totaal_kantoorkosten)}</span>
        </div>
        {totalen.extra_korting > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.extraKorting}</span>
            <span className="tabular-figures">-{euro(totalen.extra_korting)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-border pt-1.5 text-base font-semibold">
          <span>{t.totaal}</span>
          <span className="tabular-figures">{euro(totalen.totaal_bedrag)}</span>
        </div>
      </div>
    </div>
  );
}
