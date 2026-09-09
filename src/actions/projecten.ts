"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NieuwProject = { id: string; naam: string; po_nummer: string | null; omschrijving: string | null };

export type ProjectFormState = { error: string | null; success: boolean; project?: NieuwProject };

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
  const { data: project, error } = await supabase
    .from("projecten")
    .insert({
      klant_id: klantId,
      naam,
      po_nummer: po_nummer || null,
      omschrijving: omschrijving || null,
    })
    .select("id, naam, po_nummer, omschrijving")
    .single();

  if (error || !project) {
    return { error: "Aanmaken van het project is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true, project };
}

// Geen echte delete: factuuritems/facturatiebatches verwijzen naar
// projecten.id (zonder on-delete-cascade) — een harde delete zou dus
// mislukken zodra een project ooit gebruikt is, en zou anders de
// facturatiehistorie van bestaande items breken. Zelfde soort "archiveren"
// als klanten.status, zodat het project verdwijnt uit de keuzelijst voor
// nieuwe factuuritems maar bestaande items hun projectnaam/PO-nummer blijven
// tonen.
export async function deactiveerProject(projectId: string): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("projecten").update({ actief: false }).eq("id", projectId);

  if (error) {
    return {
      error: error.code === "42501" ? "Alleen beheerders of teamleiders kunnen een project archiveren." : "Archiveren is mislukt.",
      success: false,
    };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true };
}

export async function updateProject(
  projectId: string,
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
  const { data: project, error } = await supabase
    .from("projecten")
    .update({
      naam,
      po_nummer: po_nummer || null,
      omschrijving: omschrijving || null,
    })
    .eq("id", projectId)
    .select("id, naam, po_nummer, omschrijving")
    .single();

  if (error || !project) {
    return { error: "Wijzigen van het project is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true, project };
}
