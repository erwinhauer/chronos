"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type KlantFormState = { error: string | null; success: boolean };

export async function createKlant(_prevState: KlantFormState, formData: FormData): Promise<KlantFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const subtitel = String(formData.get("subtitel") ?? "").trim();
  const contactpersoon_naam = String(formData.get("contactpersoon_naam") ?? "").trim();
  const contact_email = String(formData.get("contact_email") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const accountview_debiteurnummer = String(formData.get("accountview_debiteurnummer") ?? "").trim();
  const specificatietaal = String(formData.get("specificatietaal") ?? "nl").trim();
  const kantoorkosten_actief = formData.get("kantoorkosten_actief") === "on";
  const kolom_externe_kosten_zichtbaar = formData.get("kolom_externe_kosten_zichtbaar") === "on";
  const verzending_toegestaan = formData.get("verzending_toegestaan") === "on";
  const btw_percentage = Number(formData.get("btw_percentage") ?? 21);
  const btw_vermelding = String(formData.get("btw_vermelding") ?? "").trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();

  if (!naam || !contactpersoon_naam || !contact_email) {
    return { error: "Klantnaam, contactpersoon en e-mailadres zijn verplicht.", success: false };
  }
  if (!contact_email.includes("@")) {
    return { error: "Vul een geldig e-mailadres in voor de contactpersoon.", success: false };
  }
  if (!Number.isFinite(btw_percentage) || btw_percentage < 0) {
    return { error: "Vul een geldig BTW-percentage in.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("klanten").insert({
    naam,
    subtitel: subtitel || null,
    contactpersoon_naam,
    contact_email,
    adres: adres || null,
    accountview_debiteurnummer: accountview_debiteurnummer || null,
    specificatietaal: specificatietaal as "nl" | "en",
    kantoorkosten_actief,
    kolom_externe_kosten_zichtbaar,
    verzending_toegestaan,
    btw_percentage,
    btw_vermelding: btw_vermelding || null,
    opmerkingen: opmerkingen || null,
    status: "actief",
  });

  if (error) {
    const message =
      error.code === "42501"
        ? "Alleen beheerders kunnen klanten aanmaken."
        : "Aanmaken van de klant is mislukt. Probeer het opnieuw.";
    return { error: message, success: false };
  }

  revalidatePath("/klanten");
  return { error: null, success: true };
}

export async function updateKlant(
  id: string,
  _prevState: KlantFormState,
  formData: FormData
): Promise<KlantFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const subtitel = String(formData.get("subtitel") ?? "").trim();
  const contactpersoon_naam = String(formData.get("contactpersoon_naam") ?? "").trim();
  const contact_email = String(formData.get("contact_email") ?? "").trim();
  const adres = String(formData.get("adres") ?? "").trim();
  const accountview_debiteurnummer = String(formData.get("accountview_debiteurnummer") ?? "").trim();
  const specificatietaal = String(formData.get("specificatietaal") ?? "nl").trim();
  const kantoorkosten_actief = formData.get("kantoorkosten_actief") === "on";
  const kolom_externe_kosten_zichtbaar = formData.get("kolom_externe_kosten_zichtbaar") === "on";
  const verzending_toegestaan = formData.get("verzending_toegestaan") === "on";
  const btw_percentage = Number(formData.get("btw_percentage") ?? 21);
  const btw_vermelding = String(formData.get("btw_vermelding") ?? "").trim();
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();

  if (!naam || !contactpersoon_naam || !contact_email) {
    return { error: "Klantnaam, contactpersoon en e-mailadres zijn verplicht.", success: false };
  }
  if (!contact_email.includes("@")) {
    return { error: "Vul een geldig e-mailadres in voor de contactpersoon.", success: false };
  }
  if (!Number.isFinite(btw_percentage) || btw_percentage < 0) {
    return { error: "Vul een geldig BTW-percentage in.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("klanten")
    .update({
      naam,
      subtitel: subtitel || null,
      contactpersoon_naam,
      contact_email,
      adres: adres || null,
      accountview_debiteurnummer: accountview_debiteurnummer || null,
      specificatietaal: specificatietaal as "nl" | "en",
      kantoorkosten_actief,
      kolom_externe_kosten_zichtbaar,
      verzending_toegestaan,
      btw_percentage,
      btw_vermelding: btw_vermelding || null,
      opmerkingen: opmerkingen || null,
    })
    .eq("id", id);

  if (error) {
    const message =
      error.code === "42501" ? "Alleen beheerders kunnen klanten bewerken." : "Opslaan is mislukt. Probeer het opnieuw.";
    return { error: message, success: false };
  }

  revalidatePath("/klanten");
  revalidatePath(`/klanten/${id}`);
  return { error: null, success: true };
}

export async function wisselKlantTaal(klantId: string, taal: "nl" | "en") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_klant_taal", { target_klant_id: klantId, nieuwe_taal: taal });
  if (error) {
    throw new Error("Wijzigen van de taal is mislukt.");
  }

  revalidatePath("/factuuritems");
  revalidatePath("/klanten");
  revalidatePath(`/klanten/${klantId}`);
}
