"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProjectFormState = { error: string | null; success: boolean };

export async function createProject(
  klantId: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const po_nummer = String(formData.get("po_nummer") ?? "").trim();
  const omschrijving = String(formData.get("omschrijving") ?? "").trim();

  if (!naam) {
    return { error: "Projectnaam is verplicht.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projecten").insert({
    klant_id: klantId,
    naam,
    po_nummer: po_nummer || null,
    omschrijving: omschrijving || null,
  });

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "Alleen beheerders, of teamleiders van een team dat deze klant al bedient, kunnen projecten beheren."
          : "Aanmaken van het project is mislukt.",
      success: false,
    };
  }

  revalidatePath(`/klanten/${klantId}`);
  return { error: null, success: true };
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const naam = String(formData.get("naam") ?? "").trim();
  const po_nummer = String(formData.get("po_nummer") ?? "").trim();
  const omschrijving = String(formData.get("omschrijving") ?? "").trim();
  const actief = formData.get("actief") === "on";

  if (!naam) {
    return { error: "Projectnaam is verplicht.", success: false };
  }

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projecten")
    .update({ naam, po_nummer: po_nummer || null, omschrijving: omschrijving || null, actief })
    .eq("id", id)
    .select("klant_id")
    .single();

  if (error || !project) {
    return {
      error:
        error?.code === "42501"
          ? "Alleen beheerders, of teamleiders van een team dat deze klant al bedient, kunnen projecten beheren."
          : "Opslaan is mislukt.",
      success: false,
    };
  }

  revalidatePath(`/klanten/${project.klant_id}`);
  return { error: null, success: true };
}
