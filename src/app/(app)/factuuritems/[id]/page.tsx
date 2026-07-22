import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateFactuurItem } from "@/actions/factuuritems";
import { FactuurItemForm } from "@/components/factuuritem-form";

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
    .select("*, laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name)")
    .eq("id", id)
    .single();
  if (!item) notFound();

  const laatstBewerktDoor = (item.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null)?.full_name;

  const bewerkbaar = item.medewerker_id === user.id && item.status === "aangemaakt";
  if (!bewerkbaar) {
    redirect("/factuuritems");
  }

  const { data: klanten } = await supabase
    .from("klanten")
    .select("id, naam, kantoorkosten_actief")
    .eq("status", "actief")
    .order("naam");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Factuuritem bewerken</h2>
        <p className="text-sm text-muted-foreground">Pas het factuuritem aan.</p>
        {laatstBewerktDoor && (
          <p className="mt-1 text-xs text-muted-foreground">Laatst bewerkt door {laatstBewerktDoor}</p>
        )}
      </div>
      <FactuurItemForm
        klanten={klanten ?? []}
        action={updateFactuurItem.bind(null, item.id)}
        medewerkerId={user.id}
        initial={{
          id: item.id,
          klant_id: item.klant_id,
          dossiernummer: item.dossiernummer,
          datum: item.datum,
          omschrijving_klant: item.omschrijving_klant,
          interne_opmerking: item.interne_opmerking,
          eenheidstype: item.eenheidstype,
          qty: item.qty,
          tarief: item.tarief,
          honorarium: item.honorarium,
          externe_kosten: item.externe_kosten,
          korting: item.korting,
          kantoorkosten_van_toepassing: item.kantoorkosten_van_toepassing,
          declarabel: item.declarabel,
        }}
      />
    </div>
  );
}
