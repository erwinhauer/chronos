import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { PrintKnop } from "@/components/print-knop";
import { Card, CardContent } from "@/components/ui/card";
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
    subtotaal: "Subtotal",
    kantoorkosten: "Office costs",
    totaal: "Total",
  },
};

function formatDatum(datum: string, taal: "nl" | "en") {
  return new Date(datum).toLocaleDateString(taal === "nl" ? "nl-NL" : "en-GB");
}

export default async function SpecificatiePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("facturatiebatches")
    .select("*, klanten(*), projecten(naam, po_nummer)")
    .eq("id", id)
    .single();
  if (!batch) notFound();

  const klant = batch.klanten;
  if (!klant) notFound();
  const project = batch.projecten as unknown as { naam: string; po_nummer: string | null } | null;

  const { data: items } = await supabase
    .from("factuuritems")
    .select(
      "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, volgorde)"
    )
    .eq("facturatiebatch_id", batch.id)
    .order("datum", { ascending: true });

  const taal = klant.specificatietaal;
  const t = LABELS[taal];
  const euro = (n: number) =>
    new Intl.NumberFormat(taal === "nl" ? "nl-NL" : "en-GB", { style: "currency", currency: batch.valuta }).format(n);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-semibold tracking-tight">{t.titel}</h2>
        <PrintKnop />
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="flex flex-col gap-6 p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">{klant.naam}</p>
              {klant.adres && <p className="text-sm text-muted-foreground whitespace-pre-line">{klant.adres}</p>}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t.titel}</p>
              {batch.accountview_factuurnummer && <p>{batch.accountview_factuurnummer}</p>}
              {project && <p>{project.naam}</p>}
              {project?.po_nummer && <p>PO: {project.po_nummer}</p>}
              <p>
                {t.periode}: {formatDatum(batch.periode_start, taal)} – {formatDatum(batch.periode_eind, taal)}
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
                {klant.kolom_externe_kosten_zichtbaar && (
                  <TableHead className="text-right">{t.kostenVanDerden}</TableHead>
                )}
                {klant.kolom_korting_zichtbaar && <TableHead className="text-right">{t.korting}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => {
                const medewerker = item.profiles as unknown as { full_name: string } | null;
                const dossiers = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);
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
                              {d.land ? ` · ${landNaamVoorIso(d.land)}` : ""}
                            </span>
                          </div>
                        ))}
                      </TableCell>
                    )}
                    {klant.kolom_persoon_zichtbaar && <TableCell>{medewerker?.full_name}</TableCell>}
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
              <span className="tabular-figures">{euro(batch.totaal_honorarium)}</span>
            </div>
            {batch.totaal_externe_kosten > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.kostenVanDerden}</span>
                <span className="tabular-figures">{euro(batch.totaal_externe_kosten)}</span>
              </div>
            )}
            {batch.totaal_korting > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.korting}</span>
                <span className="tabular-figures">-{euro(batch.totaal_korting)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.subtotaal}</span>
              <span className="tabular-figures">
                {euro(batch.totaal_honorarium + batch.totaal_externe_kosten - batch.totaal_korting)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.kantoorkosten}</span>
              <span className="tabular-figures">{euro(batch.totaal_kantoorkosten)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1.5 text-base font-semibold">
              <span>{t.totaal}</span>
              <span className="tabular-figures">{euro(batch.totaal_bedrag)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
