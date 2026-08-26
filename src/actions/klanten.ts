"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NieuweKlant = {
  id: string;
  naam: string;
  adres: string | null;
  patricia_id: string | null;
  kantoorkosten_actief: boolean;
  kantoorkosten_percentage: number;
  specificatietaal: "nl" | "en";
};

export type KlantFormState = { error: string | null; success: boolean; klant?: NieuweKlant };

export async function createKlant(_prevState: KlantFormState, formData: FormData): Promise<KlantFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const subtitel = String(formData.get("subtitel") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const accountview_debiteurnummer = String(formData.get("accountview_debiteurnummer") ?? "").trim();
  const specificatietaal = String(formData.get("specificatietaal") ?? "nl").trim();
  const kantoorkosten_actief = formData.get("kantoorkosten_actief") === "on";
  const kolom_externe_kosten_zichtbaar = formData.get("kolom_externe_kosten_zichtbaar") === "on";
  const btw_percentage = Number(formData.get("btw_percentage") ?? 21);
  const btw_vermelding = String(formData.get("btw_vermelding") ?? "").trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();

  if (!naam) {
    return { error: "Klantnaam is verplicht.", success: false };
  }
  if (!Number.isFinite(btw_percentage) || btw_percentage < 0) {
    return { error: "Vul een geldig BTW-percentage in.", success: false };
  }

  const supabase = await createClient();
  const { data: klant, error } = await supabase
    .from("klanten")
    .insert({
      naam,
      subtitel: subtitel || null,
      adres: adres || null,
      accountview_debiteurnummer: accountview_debiteurnummer || null,
      specificatietaal: specificatietaal as "nl" | "en",
      kantoorkosten_actief,
      kolom_externe_kosten_zichtbaar,
      btw_percentage,
      btw_vermelding: btw_vermelding || null,
      opmerkingen: opmerkingen || null,
      status: "actief",
    })
    .select("id, naam, adres, patricia_id, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal")
    .single();

  if (error || !klant) {
    const message =
      error?.code === "42501"
        ? "Je hebt geen rechten om klanten aan te maken."
        : "Aanmaken van de klant is mislukt. Probeer het opnieuw.";
    return { error: message, success: false };
  }

  return { error: null, success: true, klant };
}

export type DeactiveerKlantResultaat = { error: string | null; success: boolean };

// Zonder een aparte klantenbeheerpagina is dit de enige plek waar een
// verouderde/foutief geïmporteerde klant nog uit de zoeksuggesties (o.a. de
// HubSpot-tracklist) verwijderd kan worden — een zachte verwijdering
// (status inactief), zodat bestaande factuuritems/projecten die ernaar
// verwijzen intact blijven. RLS staat dit alleen aan beheerders toe.
export async function deactiveerKlant(klantId: string): Promise<DeactiveerKlantResultaat> {
  const supabase = await createClient();
  const { error } = await supabase.from("klanten").update({ status: "inactief" }).eq("id", klantId);

  if (error) {
    return {
      error: error.code === "42501" ? "Alleen beheerders kunnen klanten verwijderen." : "Verwijderen is mislukt.",
      success: false,
    };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true };
}

export async function wisselKlantTaal(klantId: string, taal: "nl" | "en") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_klant_taal", { target_klant_id: klantId, nieuwe_taal: taal });
  if (error) {
    throw new Error("Wijzigen van de taal is mislukt.");
  }

  revalidatePath("/factuuritems");
}
