import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { berekenFactuurtotalen } from "@/lib/factuurbedragen";
import { haalLandenMap } from "@/lib/landen";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { NieuweSpecificatieForm } from "@/components/nieuwe-specificatie-form";

export default async function NieuweSpecificatiePagina({
  searchParams,
}: {
  searchParams: Promise<{ klant_id?: string; item_ids?: string }>;
}) {
  const { klant_id, item_ids } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder" && profile?.role !== "teamleider") {
    redirect("/factuuritems");
  }

  const itemIds = (item_ids ?? "").split(",").filter(Boolean);
  if (!klant_id || itemIds.length === 0) {
    redirect("/factuuritems");
  }

  const supabase = await createClient();

  const [{ data: klant }, { data: items }, landen] = await Promise.all([
    supabase.from("klanten").select("*").eq("id", klant_id).single(),
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, kantoorkosten_van_toepassing, project_id, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("klant_id", klant_id)
      .eq("status", "aangemaakt")
      .in("id", itemIds)
      .order("datum", { ascending: true }),
    haalLandenMap(supabase),
  ]);

  if (!klant || !items || items.length !== itemIds.length) {
    redirect("/factuuritems");
  }

  const projectIds = new Set(items.map((i) => i.project_id ?? null));
  if (projectIds.size > 1) {
    redirect("/factuuritems");
  }
  const projectId = items[0]?.project_id ?? null;

  const { data: project } = projectId
    ? await supabase.from("projecten").select("naam, po_nummer").eq("id", projectId).single()
    : { data: null };

  const datums = items.map((i) => i.datum).sort();
  const periodeStart = datums[0] ?? "";
  const periodeEind = datums[datums.length - 1] ?? "";

  const totalen = berekenFactuurtotalen(items, klant.kantoorkosten_percentage);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: "Nieuwe specificatie" }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nieuwe specificatie — {klant.naam}</h2>
        <p className="text-sm text-muted-foreground">Controleer de specificatie voordat je bevestigt.</p>
      </div>

      <NieuweSpecificatieForm
        klant={klant}
        project={project}
        itemIds={items.map((i) => i.id)}
        periodeStart={periodeStart}
        periodeEind={periodeEind}
        landen={landen}
        items={items.map((item) => ({
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
        basisTotalen={{
          totaal_honorarium: totalen.totaalHonorarium,
          totaal_externe_kosten: totalen.totaalExterneKosten,
          totaal_korting: totalen.totaalKorting,
          totaal_kantoorkosten: totalen.totaalKantoorkosten,
          subtotaal_voor_extra_korting: totalen.subtotaalVoorExtraKorting,
        }}
      />
    </div>
  );
}
