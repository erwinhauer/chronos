import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateFactuurItem } from "@/actions/factuuritems";
import { FactuurItemForm } from "@/components/factuuritem-form";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";

export default async function FactuurItemBewerkenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("factuuritems")
    .select(
      "*, laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
    )
    .eq("id", id)
    .single();
  if (!item) notFound();

  const laatstBewerktDoor = (item.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null)?.full_name;
  const dossiersOpItem = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);

  const bewerkbaar = item.medewerker_id === user.id && item.status === "aangemaakt";
  if (!bewerkbaar) {
    redirect("/factuuritems");
  }

  const [{ data: klanten }, { data: projecten }, { data: actieveDossiers }] = await Promise.all([
    supabase
      .from("klanten")
      .select("id, naam, adres, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal")
      .eq("status", "actief")
      .order("naam"),
    supabase.from("projecten").select("id, klant_id, naam, po_nummer").eq("actief", true).order("naam"),
    supabase.from("patricia_dossiers").select("klant_id, dossiernummer, matter_naam").eq("actief", true).order("dossiernummer"),
  ]);

  // De al aan dit item gekoppelde dossiers blijven altijd herleidbaar/bewerkbaar,
  // ook als ze inmiddels inactief zijn — samengevoegd met de actieve suggesties
  // voor de typeahead (dossiernummer is hier de sleutel, niet meer een id).
  const dossiers = new Map<string, { klant_id: string; dossiernummer: string; matter_naam: string | null }>(
    (actieveDossiers ?? []).map((d) => [d.dossiernummer, d])
  );
  for (const d of dossiersOpItem) {
    if (!dossiers.has(d.dossiernummer)) {
      dossiers.set(d.dossiernummer, { klant_id: item.klant_id, dossiernummer: d.dossiernummer, matter_naam: d.matter_naam });
    }
  }

  const projectenPerKlant: Record<string, { id: string; naam: string; po_nummer: string | null }[]> = {};
  for (const p of projecten ?? []) {
    (projectenPerKlant[p.klant_id] ??= []).push({ id: p.id, naam: p.naam, po_nummer: p.po_nummer });
  }

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: "Bewerken" }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Factuuritem bewerken</h2>
        <p className="text-sm text-muted-foreground">Pas het factuuritem aan.</p>
        {laatstBewerktDoor && (
          <p className="mt-1 text-xs text-muted-foreground">Laatst bewerkt door {laatstBewerktDoor}</p>
        )}
      </div>
      <FactuurItemForm
        klanten={klanten ?? []}
        dossiers={Array.from(dossiers.values())}
        projectenPerKlant={projectenPerKlant}
        action={updateFactuurItem.bind(null, item.id)}
        medewerkerId={user.id}
        initial={{
          id: item.id,
          dossiernummers: dossiersOpItem.map((d) => d.dossiernummer),
          klant_id_fallback: item.klant_id,
          project_id: item.project_id,
          datum: item.datum,
          omschrijving_klant: item.omschrijving_klant,
          interne_opmerking: item.interne_opmerking,
          eenheidstype: item.eenheidstype,
          qty: item.qty,
          prijstype: item.prijstype,
          tarief: item.tarief,
          externe_kosten: item.externe_kosten,
          korting: item.korting,
          korting_type: item.korting_type,
          korting_percentage: item.korting_percentage,
          kantoorkosten_van_toepassing: item.kantoorkosten_van_toepassing,
          declarabel: item.declarabel,
        }}
      />
    </div>
  );
}
