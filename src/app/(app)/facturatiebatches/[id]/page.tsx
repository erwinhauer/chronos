import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { PrintKnop } from "@/components/print-knop";
import { FactuurCover } from "@/components/factuur-cover";
import { FactuurSpecificatie } from "@/components/factuur-specificatie";
import { DownloadFactuurKnop } from "@/components/download-factuur-knop";
import { VerstuurOpnieuwKnop } from "@/components/verstuur-opnieuw-knop";
import { haalLandenMap } from "@/lib/landen";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SpecificatiePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: batch } = await supabase
    .from("facturatiebatches")
    .select("*, klanten(*), projecten(naam, po_nummer)")
    .eq("id", id)
    .single();
  if (!batch) notFound();

  const klant = batch.klanten;
  if (!klant) notFound();
  const project = batch.projecten as unknown as { naam: string; po_nummer: string | null } | null;

  const [{ data: items }, landen] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("facturatiebatch_id", batch.id)
      .order("datum", { ascending: true }),
    haalLandenMap(supabase),
  ]);

  const titel = klant.specificatietaal === "nl" ? "Specificatie" : "Fee Note";
  const magOpnieuwVersturen = profile?.role === "finance" || profile?.role === "beheerder";
  const magDownloaden = profile?.role === "finance" || profile?.role === "beheerder" || profile?.role === "directie";

  const totalen = {
    totaal_honorarium: batch.totaal_honorarium,
    totaal_externe_kosten: batch.totaal_externe_kosten,
    totaal_korting: batch.totaal_korting,
    totaal_kantoorkosten: batch.totaal_kantoorkosten,
    extra_korting: batch.extra_korting,
    totaal_bedrag: batch.totaal_bedrag,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 print:max-w-none">
      <style>{"@media print { @page { size: A4 landscape; } }"}</style>
      <SetBreadcrumb
        segments={[
          { label: "Klanten", href: "/klanten" },
          { label: klant.naam, href: `/klanten/${klant.id}` },
          { label: titel },
        ]}
      />
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-semibold tracking-tight">{titel}</h2>
        <div className="flex items-center gap-2">
          {magDownloaden && (
            <>
              <DownloadFactuurKnop batchId={batch.id} soort="factuur" label="Download factuur (PDF)" />
              <DownloadFactuurKnop batchId={batch.id} soort="specificatie" label="Download specificatie (PDF)" />
            </>
          )}
          <PrintKnop />
        </div>
      </div>

      {!klant.verzending_toegestaan ? (
        <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm print:hidden">
          <Badge variant="secondary">Alleen PDF</Badge>
          <span className="text-muted-foreground">
            Deze klant werkt met een eigen billing-systeem — er is geen e-mail verstuurd.
          </span>
        </div>
      ) : (
        (batch.verzonden_op || batch.verzend_fout) && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 print:hidden">
            {batch.verzonden_op ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="success">Verstuurd</Badge>
                <span className="text-muted-foreground">
                  Verstuurd op {new Date(batch.verzonden_op).toLocaleString("nl-NL")} naar {batch.verzend_email}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="warning">Niet verstuurd</Badge>
                <span className="text-muted-foreground">{batch.verzend_fout}</span>
              </div>
            )}
            {magOpnieuwVersturen && <VerstuurOpnieuwKnop batchId={batch.id} />}
          </div>
        )
      )}

      <Card className="print:border-none print:shadow-none">
        <CardContent className="flex flex-col gap-8 p-8">
          <FactuurCover
            klant={klant}
            project={project}
            valuta={batch.valuta}
            periodeStart={batch.periode_start}
            periodeEind={batch.periode_eind}
            totalen={totalen}
            btwPercentage={batch.btw_percentage ?? 0}
            btwBedrag={batch.btw_bedrag}
            btwVermelding={batch.btw_vermelding}
            factuurnummer={batch.accountview_factuurnummer}
            factuurdatum={batch.accountview_factuurdatum}
          />
          <FactuurSpecificatie
            klant={klant}
            periodeStart={batch.periode_start}
            periodeEind={batch.periode_eind}
            valuta={batch.valuta}
            landen={landen}
            items={(items ?? []).map((item) => ({
              id: item.id,
              datum: item.datum,
              omschrijving_klant: item.omschrijving_klant,
              eenheidstype: item.eenheidstype,
              qty: item.qty,
              tarief: item.tarief,
              honorarium: item.honorarium,
              externe_kosten: item.externe_kosten,
              korting: item.korting,
              medewerkerNaam: (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
              dossiers: item.factuuritem_dossiers ?? [],
            }))}
            totalen={totalen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
