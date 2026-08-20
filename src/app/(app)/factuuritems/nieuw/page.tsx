import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createFactuurItem } from "@/actions/factuuritems";
import { FactuurItemForm } from "@/components/factuuritem-form";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";

export default async function NieuwFactuurItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: klanten }, { data: projecten }, { data: dossiers }] = await Promise.all([
    supabase
      .from("klanten")
      .select("id, naam, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal")
      .eq("status", "actief")
      .order("naam"),
    supabase.from("projecten").select("id, klant_id, naam, po_nummer").eq("actief", true).order("naam"),
    supabase.from("patricia_dossiers").select("id, klant_id, dossiernummer, matter_naam").eq("actief", true).order("dossiernummer"),
  ]);

  const projectenPerKlant: Record<string, { id: string; naam: string; po_nummer: string | null }[]> = {};
  for (const p of projecten ?? []) {
    (projectenPerKlant[p.klant_id] ??= []).push({ id: p.id, naam: p.naam, po_nummer: p.po_nummer });
  }

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: "Nieuw" }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nieuw factuuritem</h2>
        <p className="text-sm text-muted-foreground">Leg een werkzaamheid, uren of kosten vast op een dossier.</p>
      </div>
      <FactuurItemForm
        klanten={klanten ?? []}
        dossiers={dossiers ?? []}
        projectenPerKlant={projectenPerKlant}
        action={createFactuurItem}
        medewerkerId={user.id}
      />
    </div>
  );
}
