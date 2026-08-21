"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { berekenBtw, berekenFactuurtotalen, round2 } from "@/lib/factuurbedragen";
import { verstuurFactuur } from "@/actions/factuur-verzending";

export type FactureerFormState = { error: string | null; success: boolean };

export async function createFacturatiebatch(
  _prevState: FactureerFormState,
  formData: FormData
): Promise<FactureerFormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder" && profile?.role !== "teamleider") {
    return { error: "Alleen finance, beheerder en teamleider kunnen factureren.", success: false };
  }

  const klant_id = String(formData.get("klant_id") ?? "");
  const itemIds = formData.getAll("item_ids").map(String);
  const periode_start = String(formData.get("periode_start") ?? "");
  const periode_eind = String(formData.get("periode_eind") ?? "");
  const extra_korting = round2(Number(formData.get("extra_korting") ?? 0)) || 0;
  const verzend_email = String(formData.get("verzend_email") ?? "").trim();
  const verzend_cc = String(formData.get("verzend_cc") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

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
      error: "Alle geselecteerde items moeten tot hetzelfde project behoren (of geen project hebben) om samen gefactureerd te worden.",
      success: false,
    };
  }
  const project_id = items[0]?.project_id ?? null;

  const { data: klant, error: klantError } = await supabase
    .from("klanten")
    .select("kantoorkosten_percentage, btw_percentage, btw_vermelding")
    .eq("id", klant_id)
    .single();
  if (klantError || !klant) {
    return { error: "Ophalen van de klantgegevens is mislukt.", success: false };
  }

  const { totaalHonorarium, totaalExterneKosten, totaalKorting, totaalKantoorkosten, subtotaalVoorExtraKorting } =
    berekenFactuurtotalen(items, klant.kantoorkosten_percentage);

  if (extra_korting > subtotaalVoorExtraKorting) {
    return { error: "Extra korting kan niet groter zijn dan het factuurbedrag.", success: false };
  }
  const totaalBedrag = round2(subtotaalVoorExtraKorting - extra_korting);
  const btwBedrag = berekenBtw(totaalBedrag, klant.btw_percentage);

  // Voorlopige, oplopende nummering — geen echte Accountview-koppeling.
  // Simpel max+1 (geen sequence/retry): laag concurrentierisico bij dit
  // kantoor, en de definitieve reeks/opmaak volgt later na afstemming met
  // de Controller.
  const { data: bestaandeNummers } = await supabase
    .from("facturatiebatches")
    .select("accountview_factuurnummer")
    .not("accountview_factuurnummer", "is", null);
  const hoogsteBestaand = Math.max(
    999,
    ...(bestaandeNummers ?? []).map((b) => parseInt(b.accountview_factuurnummer ?? "0", 10) || 0)
  );
  const accountview_factuurnummer = String(hoogsteBestaand + 1);
  const accountview_factuurdatum = new Date().toISOString().slice(0, 10);

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
      btw_percentage: klant.btw_percentage,
      btw_bedrag: btwBedrag,
      btw_vermelding: klant.btw_vermelding,
      accountview_factuurnummer,
      accountview_factuurdatum,
      verzend_email: verzend_email || null,
      verzend_cc: verzend_cc.length > 0 ? verzend_cc : null,
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

  // De omzet is nu geboekt (status "gefactureerd"/"definitief"), onafhankelijk
  // van of de PDF hierna daadwerkelijk verstuurd raakt — een mislukte
  // verzending draait dit bewust niet terug (zie routekaart, fase 3-besluit).
  await verstuurFactuur(batch.id);

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  revalidatePath(`/klanten/${klant_id}`);
  redirect(`/facturatiebatches/${batch.id}`);
}
