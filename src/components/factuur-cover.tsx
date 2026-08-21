import { KNIJFF_KANTOOR } from "@/lib/knijff-kantoorgegevens";

const LABELS = {
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

export type FactuurCoverKlant = {
  naam: string;
  adres: string | null;
  accountview_debiteurnummer: string | null;
  specificatietaal: "nl" | "en";
};

export type FactuurCoverTotalen = {
  totaal_honorarium: number;
  totaal_externe_kosten: number;
  totaal_korting: number;
  totaal_kantoorkosten: number;
  extra_korting: number;
  totaal_bedrag: number;
};

export function FactuurCover({
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
  klant: FactuurCoverKlant;
  project: { naam: string; po_nummer: string | null } | null;
  valuta: string;
  periodeStart: string;
  periodeEind: string;
  totalen: FactuurCoverTotalen;
  btwPercentage: number;
  btwBedrag: number;
  btwVermelding: string | null;
  factuurnummer?: string | null;
  factuurdatum?: string | null;
  medewerkerInitialen?: string | null;
}) {
  const taal = klant.specificatietaal;
  const t = LABELS[taal];
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

  return (
    <div className="flex flex-col gap-6 text-sm">
      <div>
        <p className="text-lg font-bold tracking-wide">KNIJFF</p>
        <p className="text-xs text-muted-foreground">Trademark Attorneys</p>
      </div>

      <div>
        <p className="font-medium">{klant.naam}</p>
        {klant.adres && <p className="whitespace-pre-line text-muted-foreground">{klant.adres}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <p>
          {KNIJFF_KANTOOR.stad}, {formatDatum(factuurdatum ?? new Date().toISOString(), taal)}
        </p>
        <p>
          <span className="font-semibold">{t.factuurLabel}: </span>
          {factuurnummer ?? "—"}
        </p>
        <p>
          <span className="font-semibold">{t.debiteurNr}: </span>
          {klant.accountview_debiteurnummer ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-md border border-border p-3">
        <div>
          <p className="text-xs font-semibold">{t.onzeRef}</p>
          <p>{project?.naam ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold">{t.uwRef}</p>
          <p>{project?.po_nummer ? `PO ${project.po_nummer}` : "—"}</p>
        </div>
        <div className="text-right font-semibold">{valuta}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        {regels.map((regel) => (
          <div key={regel.label} className="flex justify-between">
            <span>{regel.label}</span>
            <span className="tabular-figures">{euro(regel.bedrag)}</span>
          </div>
        ))}
      </div>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.subTotaal}</span>
          <span className="tabular-figures">{euro(subTotaal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t.btw} {btwPercentage.toLocaleString(taal === "nl" ? "nl-NL" : "en-GB")}%
          </span>
          <span className="tabular-figures">{euro(btwBedrag)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
          <span>
            {t.totaalIn} {valuta}
          </span>
          <span className="tabular-figures">{euro(totaalMetBtw)}</span>
        </div>
        {btwVermelding && <p className="pt-1 text-right text-xs text-muted-foreground">{btwVermelding}</p>}
      </div>

      {medewerkerInitialen && <p className="text-xs text-muted-foreground">{medewerkerInitialen}/</p>}

      <div className="grid grid-cols-2 gap-4 rounded-md border border-border p-3 text-xs">
        <p className="font-semibold">IBAN: {KNIJFF_KANTOOR.iban}</p>
        <p className="font-medium">{t.betalingstermijn}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">{KNIJFF_KANTOOR.naam}</p>
          <p>{KNIJFF_KANTOOR.straat}</p>
          <p>
            {KNIJFF_KANTOOR.postcodePlaats} | {KNIJFF_KANTOOR.land}
          </p>
        </div>
        <div>
          <p>{KNIJFF_KANTOOR.telefoon}</p>
          <p>{KNIJFF_KANTOOR.email}</p>
          <p>{KNIJFF_KANTOOR.website}</p>
        </div>
        <div>
          <p>btw/vat {KNIJFF_KANTOOR.btwNummer}</p>
          <p>kvk {KNIJFF_KANTOOR.kvkNummer}</p>
          <p>
            iban {KNIJFF_KANTOOR.iban} | bic {KNIJFF_KANTOOR.bic}
          </p>
        </div>
      </div>
    </div>
  );
}
