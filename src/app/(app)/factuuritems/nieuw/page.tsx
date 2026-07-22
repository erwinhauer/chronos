import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createFactuurItem } from "@/actions/factuuritems";
import { FactuurItemForm } from "@/components/factuuritem-form";

export default async function NieuwFactuurItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: klanten } = await supabase
    .from("klanten")
    .select("id, naam, kantoorkosten_actief")
    .eq("status", "actief")
    .order("naam");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nieuw factuuritem</h2>
        <p className="text-sm text-muted-foreground">Leg een werkzaamheid, uren of kosten vast op een dossier.</p>
      </div>
      <FactuurItemForm klanten={klanten ?? []} action={createFactuurItem} medewerkerId={user.id} />
    </div>
  );
}
