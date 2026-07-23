"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type KlantFormState = { error: string | null; success: boolean };

export async function createKlant(_prevState: KlantFormState, formData: FormData): Promise<KlantFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const subtitel = String(formData.get("subtitel") ?? "").trim();
  const contactpersoon_naam = String(formData.get("contactpersoon_naam") ?? "").trim();
  const contact_email = String(formData.get("contact_email") ?? "").trim();
  const specificatietaal = String(formData.get("specificatietaal") ?? "nl").trim();
  const kantoorkosten_actief = formData.get("kantoorkosten_actief") === "on";
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();

  if (!naam || !contactpersoon_naam || !contact_email) {
    return { error: "Klantnaam, contactpersoon en e-mailadres zijn verplicht.", success: false };
  }
  if (!contact_email.includes("@")) {
    return { error: "Vul een geldig e-mailadres in voor de contactpersoon.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("klanten").insert({
    naam,
    subtitel: subtitel || null,
    contactpersoon_naam,
    contact_email,
    specificatietaal: specificatietaal as "nl" | "en",
    kantoorkosten_actief,
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
  const specificatietaal = String(formData.get("specificatietaal") ?? "nl").trim();
  const kantoorkosten_actief = formData.get("kantoorkosten_actief") === "on";
  const opmerkingen = String(formData.get("opmerkingen") ?? "").trim();

  if (!naam || !contactpersoon_naam || !contact_email) {
    return { error: "Klantnaam, contactpersoon en e-mailadres zijn verplicht.", success: false };
  }
  if (!contact_email.includes("@")) {
    return { error: "Vul een geldig e-mailadres in voor de contactpersoon.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("klanten")
    .update({
      naam,
      subtitel: subtitel || null,
      contactpersoon_naam,
      contact_email,
      specificatietaal: specificatietaal as "nl" | "en",
      kantoorkosten_actief,
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
