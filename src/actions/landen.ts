"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LandFormState = { error: string | null; success: boolean };

export async function updateLandnaam(
  isoCode: string,
  _prevState: LandFormState,
  formData: FormData
): Promise<LandFormState> {
  const naam_nl = String(formData.get("naam_nl") ?? "").trim();
  const naam_en = String(formData.get("naam_en") ?? "").trim();

  if (!naam_nl || !naam_en) {
    return { error: "Beide namen zijn verplicht.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("landcodes").update({ naam_nl, naam_en }).eq("iso_code", isoCode);

  if (error) {
    const message = error.code === "42501" ? "Alleen beheerders kunnen de landenlijst bewerken." : "Opslaan is mislukt.";
    return { error: message, success: false };
  }

  revalidatePath("/instellingen");
  return { error: null, success: true };
}
