import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { FactuurSpecificatie, metSpecificatieDetailniveau } from "@/components/factuur-specificatie";
import { FactuurVoorbeeldKaart } from "@/components/factuur-voorbeeld-kaart";
import { DownloadSpecificatieKnop } from "@/components/download-specificatie-knop";
import { haalLandenMap } from "@/lib/landen";

export default async function SpecificatiePagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: batch } = await supabase
    .from("facturatiebatches")
    .select(
      "*, klanten(*), projecten(naam, po_nummer), profiles!facturatiebatches_goedgekeurd_door_fkey(full_name)"
    )
    .eq("id", id)
    .single();
  if (!batch) notFound();

  const klant = batch.klanten;
  if (!klant) notFound();
  // De kolomkeuze voor kosten van derden/korting is bevroren op de batch zelf
  // vastgelegd (bij aanmaken van de specificatie) — niet dezelfde als de
  // (later wijzigbare) standaardinstelling van de klant.
  const specificatieKlant = metSpecificatieDetailniveau(klant, {
    kolom_externe_kosten_zichtbaar: batch.kolom_externe_kosten_zichtbaar,
    kolom_korting_zichtbaar: batch.kolom_korting_zichtbaar,
  });

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
  const magDownloaden =
    profile?.role === "finance" ||
    profile?.role === "beheerder" ||
    profile?.role === "directie" ||
    profile?.role === "teamleider";

  const totalen = {
    totaal_honorarium: batch.totaal_honorarium,
    totaal_externe_kosten: batch.totaal_externe_kosten,
    totaal_korting: batch.totaal_korting,
    totaal_kantoorkosten: batch.totaal_kantoorkosten,
    extra_korting: batch.extra_korting,
    totaal_bedrag: batch.totaal_bedrag,
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 print:max-w-none">
      <SetBreadcrumb
        segments={[
          { label: "Factuuritems", href: "/factuuritems" },
          { label: klant.naam, href: `/factuuritems/klant/${klant.id}` },
          { label: titel },
        ]}
      />
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-semibold tracking-tight">{titel}</h2>
        {magDownloaden && <DownloadSpecificatieKnop specificatieId={batch.id} />}
      </div>

      <p className="hidden text-sm text-muted-foreground print:block">
        Gebruik de downloadknop boven deze pagina voor de specificatie-PDF — deze voorbeeldweergave is niet
        bedoeld om direct af te drukken.
      </p>

      <div className="flex flex-col gap-6 print:hidden">
        <FactuurVoorbeeldKaart>
          <FactuurSpecificatie
            klant={specificatieKlant}
            project={batch.projecten as unknown as { naam: string; po_nummer: string | null } | null}
            voorbereidDoor={
              (batch.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"
            }
            periodeStart={batch.periode_start}
            periodeEind={batch.periode_eind}
            aangemaaktOp={batch.created_at}
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
        </FactuurVoorbeeldKaart>
      </div>
    </div>
  );
}
