"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { berekenFactuurtotalen, round2 } from "@/lib/factuurbedragen";

export type SpecificatieFormState = { error: string | null; success: boolean };

// Groepeert de geselecteerde factuuritems, legt ze vast als "definitief" (dit
// blijft nodig — isGefactureerd/de omzet-rapportage op het dashboard hangt
// puur aan factuuritems.status, niet aan of er ooit een factuur is verstuurd)
// en genereert de specificatie. Het daadwerkelijke factureren gebeurt daarna
// handmatig, buiten Chronos om — geen factuurnummer, geen BTW-berekening, geen
// verzending meer.
export async function genereerSpecificatie(
  _prevState: SpecificatieFormState,
  formData: FormData
): Promise<SpecificatieFormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder" && profile?.role !== "teamleider") {
    return { error: "Alleen finance, beheerder en teamleider kunnen een specificatie maken.", success: false };
  }

  const klant_id = String(formData.get("klant_id") ?? "");
  const itemIds = formData.getAll("item_ids").map(String);
  const periode_start = String(formData.get("periode_start") ?? "");
  const periode_eind = String(formData.get("periode_eind") ?? "");
  const extra_korting = round2(Number(formData.get("extra_korting") ?? 0)) || 0;

  if (!klant_id || itemIds.length === 0) {
    return { error: "Selecteer minimaal één factuuritem.", success: false };
  }
  if (!periode_start || !periode_eind) {
    return { error: "Vul de periode in.", success: false };
  }
  if (periode_eind < periode_start) {
    return { error: "Einddatum van de periode mag niet vóór de startdatum liggen.", success: false };
  }
  if (extra_korting < 0) {
    return { error: "Extra korting kan niet negatief zijn.", success: false };
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
      error: "Alle geselecteerde items moeten tot hetzelfde project behoren (of geen project hebben) om samen in één specificatie te komen.",
      success: false,
    };
  }
  const project_id = items[0]?.project_id ?? null;

  const { data: klant, error: klantError } = await supabase
    .from("klanten")
    .select("kantoorkosten_percentage")
    .eq("id", klant_id)
    .single();
  if (klantError || !klant) {
    return { error: "Ophalen van de klantgegevens is mislukt.", success: false };
  }

  const { totaalHonorarium, totaalExterneKosten, totaalKorting, totaalKantoorkosten, subtotaalVoorExtraKorting } =
    berekenFactuurtotalen(items, klant.kantoorkosten_percentage);

  if (extra_korting > subtotaalVoorExtraKorting) {
    return { error: "Extra korting kan niet groter zijn dan het bedrag van de specificatie.", success: false };
  }
  const totaalBedrag = round2(subtotaalVoorExtraKorting - extra_korting);

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
      extra_korting,
      totaal_bedrag: totaalBedrag,
      goedgekeurd_door: user?.id,
      goedgekeurd_op: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: "Aanmaken van de specificatie is mislukt.", success: false };
  }

  const { error: updateError } = await supabase
    .from("factuuritems")
    .update({ facturatiebatch_id: batch.id, status: "definitief" })
    .in(
      "id",
      items.map((i) => i.id)
    );

  if (updateError) {
    return { error: "Koppelen van de items aan de specificatie is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  revalidatePath(`/klanten/${klant_id}`);
  redirect(`/specificaties/${batch.id}`);
}
