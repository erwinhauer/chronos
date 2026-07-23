"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";

export type FactureerFormState = { error: string | null; success: boolean };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createFacturatiebatch(
  _prevState: FactureerFormState,
  formData: FormData
): Promise<FactureerFormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder") {
    return { error: "Alleen finance en beheerder kunnen factureren.", success: false };
  }

  const klant_id = String(formData.get("klant_id") ?? "");
  const itemIds = formData.getAll("item_ids").map(String);
  const periode_start = String(formData.get("periode_start") ?? "");
  const periode_eind = String(formData.get("periode_eind") ?? "");

  if (!klant_id || itemIds.length === 0) {
    return { error: "Selecteer minimaal één factuuritem.", success: false };
  }
  if (!periode_start || !periode_eind) {
    return { error: "Vul de periode in.", success: false };
  }
  if (periode_eind < periode_start) {
    return { error: "Einddatum van de periode mag niet vóór de startdatum liggen.", success: false };
  }

  const supabase = await createClient();

  const { data: items, error: itemsError } = await supabase
    .from("factuuritems")
    .select("id, honorarium, externe_kosten, korting, kantoorkosten_van_toepassing, project_id")
    .eq("klant_id", klant_id)
    .eq("status", "aangemaakt")
    .in("id", itemIds);

  if (itemsError) {
    return { error: "Ophalen van de geselecteerde items is mislukt.", success: false };
  }
  if (!items || items.length !== itemIds.length) {
    return {
      error: "Een of meer geselecteerde items zijn niet meer beschikbaar (mogelijk al gefactureerd door iemand anders).",
      success: false,
    };
  }

  const projectIds = new Set(items.map((i) => i.project_id ?? null));
  if (projectIds.size > 1) {
    return {
      error: "Alle geselecteerde items moeten tot hetzelfde project behoren (of geen project hebben) om samen gefactureerd te worden.",
      success: false,
    };
  }
  const project_id = items[0]?.project_id ?? null;

  const totaalHonorarium = round2(items.reduce((som, i) => som + i.honorarium, 0));
  const totaalExterneKosten = round2(items.reduce((som, i) => som + i.externe_kosten, 0));
  const totaalKorting = round2(items.reduce((som, i) => som + i.korting, 0));
  const totaalKantoorkosten = round2(
    items.reduce(
      (som, i) => som + (i.kantoorkosten_van_toepassing ? (i.honorarium + i.externe_kosten - i.korting) * 0.06 : 0),
      0
    )
  );
  const totaalBedrag = round2(totaalHonorarium + totaalExterneKosten - totaalKorting + totaalKantoorkosten);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: batch, error: batchError } = await supabase
    .from("facturatiebatches")
    .insert({
      klant_id,
      project_id,
      periode_start,
      periode_eind,
      status: "gefactureerd",
      totaal_honorarium: totaalHonorarium,
      totaal_externe_kosten: totaalExterneKosten,
      totaal_korting: totaalKorting,
      totaal_kantoorkosten: totaalKantoorkosten,
      totaal_bedrag: totaalBedrag,
      goedgekeurd_door: user?.id,
      goedgekeurd_op: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: "Aanmaken van de factuur is mislukt.", success: false };
  }

  const { error: updateError } = await supabase
    .from("factuuritems")
    .update({ facturatiebatch_id: batch.id, status: "definitief" })
    .in(
      "id",
      items.map((i) => i.id)
    );

  if (updateError) {
    return { error: "Koppelen van de items aan de factuur is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  revalidatePath(`/klanten/${klant_id}`);
  redirect(`/facturatiebatches/${batch.id}`);
}
