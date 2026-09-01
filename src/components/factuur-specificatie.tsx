import { landNaamVoorIso } from "@/lib/dossiernummer";
import type { LandenMap } from "@/lib/landen";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABELS = {
  nl: {
    titel: "Specificatie factuur",
    periode: "Periode",
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
    honorarium: "Honorarium",
    kantoorkosten: "Kantoorkosten",
    extraKorting: "Extra korting",
    subtotaal: "Subtotaal",
    totaal: "Totaal",
  },
  en: {
    titel: "Specification invoice",
    periode: "Period",
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
    honorarium: "Fee",
    kantoorkosten: "Office costs",
    extraKorting: "Additional discount",
    subtotaal: "Subtotal",
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

export function FactuurSpecificatie({
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
}) {
  const taal = klant.specificatietaal;
  const t = LABELS[taal];
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{t.titel}</h1>
          <h2 className="text-lg font-semibold text-muted-foreground">{klant.naam}</h2>
          {projectRegel && <h4 className="text-sm font-bold">{projectRegel}</h4>}
          <div className="mt-2 flex flex-col gap-0.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{formatMaandJaar(periodeStart, periodeEind, taal)}</p>
            <p>
              {t.aangemaaktOp}: {formatDatum(aangemaaktOp, taal)}
            </p>
            <p>
              {t.opgesteldDoor}: {voorbereidDoor}
            </p>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/knijff%20trademark%20attorneys%20-%20dark%20navy.svg"
          alt="Knijff"
          className="h-16 w-auto shrink-0"
        />
      </div>

      <Table className="[&_td]:px-1.5 [&_th]:px-1.5 [&_td]:text-xs [&_th]:text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-normal">{t.datum}</TableHead>
            <TableHead className="whitespace-normal">{t.knijffRefMatter}</TableHead>
            {klant.kolom_matter_type_land_zichtbaar && (
              <TableHead className="whitespace-normal">{t.land}</TableHead>
            )}
            <TableHead className="whitespace-normal">{t.omschrijving}</TableHead>
            {klant.kolom_uren_zichtbaar && <TableHead className="whitespace-normal text-right">{t.aantal}</TableHead>}
            {klant.kolom_tarief_zichtbaar && <TableHead className="whitespace-normal text-right">{t.tarief}</TableHead>}
            {klant.kolom_externe_kosten_zichtbaar && (
              <TableHead className="whitespace-normal text-right">{t.kostenVanDerden}</TableHead>
            )}
            {toontKortingKolom && <TableHead className="whitespace-normal text-right">{t.korting}</TableHead>}
            <TableHead className="whitespace-normal text-right">{t.totaalExBtw}</TableHead>
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
                <TableCell className="whitespace-normal break-words">
                  <div>{dossiers.map((d) => d.dossiernummer).join("; ")}</div>
                  <div className="text-muted-foreground">{matterNamen.join(", ")}</div>
                </TableCell>
                {klant.kolom_matter_type_land_zichtbaar && (
                  <TableCell className="whitespace-normal">{landNaamVoorIso(eerste?.land ?? null, landen)}</TableCell>
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
                {toontKortingKolom && (
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

      <div className="flex flex-col gap-1 self-end text-sm sm:w-72">
        {klant.kolom_korting_zichtbaar && totalen.totaal_korting > 0 && (
          <TotalenRij label={t.korting} value={`- ${euro(totalen.totaal_korting)}`} />
        )}
        <TotalenRij label={t.subtotaal} value={euro(totaalExBtw)} />
        {totalen.totaal_kantoorkosten > 0 && (
          <TotalenRij label={t.kantoorkosten} value={euro(totalen.totaal_kantoorkosten)} />
        )}
        {totalen.extra_korting > 0 && (
          <TotalenRij label={t.extraKorting} value={`- ${euro(totalen.extra_korting)}`} />
        )}
        <div className="my-1 border-t border-border" />
        <TotalenRij label={t.totaal} value={euro(totalen.totaal_bedrag)} bold />
      </div>
    </div>
  );
}

function TotalenRij({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="tabular-figures">{value}</span>
    </div>
  );
}
