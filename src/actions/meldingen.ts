"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { assertBeheerder } from "@/actions/admin";
import type { Database } from "@/lib/supabase/types";

type MeldingSoort = Database["public"]["Enums"]["melding_soort"];

export type MeldingFormState = { error: string | null; success: boolean };

const SOORTEN: MeldingSoort[] = ["info", "waarschuwing", "urgent"];
const MAX_TEKST = 500;

function leesInvoer(
  formData: FormData
): { soort: MeldingSoort; tekst: string; wegklikbaar: boolean } | { error: string } {
  const soort = String(formData.get("soort") ?? "") as MeldingSoort;
  const tekst = String(formData.get("tekst") ?? "").trim();
  if (!SOORTEN.includes(soort)) return { error: "Kies een soort melding." };
  if (!tekst) return { error: "Typ de tekst van de melding." };
  if (tekst.length > MAX_TEKST) return { error: `De tekst mag maximaal ${MAX_TEKST} tekens zijn.` };
  return { soort, tekst, wegklikbaar: formData.get("wegklikbaar") === "on" };
}

function ververs() {
  // Het layout toont de meldingen, dus de hele app opnieuw ophalen voor wie nu kijkt.
  revalidatePath("/", "layout");
}

export async function createMelding(_prev: MeldingFormState, formData: FormData): Promise<MeldingFormState> {
  const beheerder = await assertBeheerder();
  const invoer = leesInvoer(formData);
  if ("error" in invoer) return { error: invoer.error, success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("meldingen").insert({ ...invoer, actief: true, created_by: beheerder.id });
  if (error) return { error: "Plaatsen van de melding is mislukt.", success: false };

  ververs();
  return { error: null, success: true };
}

// Na een tekstwijziging krijgt iedereen de melding weer te zien, ook wie hem al had weggeklikt.
export async function updateMelding(
  meldingId: string,
  _prev: MeldingFormState,
  formData: FormData
): Promise<MeldingFormState> {
  await assertBeheerder();
  const invoer = leesInvoer(formData);
  if ("error" in invoer) return { error: invoer.error, success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("meldingen").update(invoer).eq("id", meldingId);
  if (error) return { error: "Bijwerken van de melding is mislukt.", success: false };
  await supabase.from("melding_gesloten").delete().eq("melding_id", meldingId);

  ververs();
  return { error: null, success: true };
}

export async function setMeldingActief(meldingId: string, actief: boolean): Promise<MeldingFormState> {
  await assertBeheerder();
  const supabase = await createClient();
  const { error } = await supabase.from("meldingen").update({ actief }).eq("id", meldingId);
  if (error) return { error: "Bijwerken van de melding is mislukt.", success: false };
  // Opnieuw aanzetten toont de melding weer aan iedereen.
  if (actief) await supabase.from("melding_gesloten").delete().eq("melding_id", meldingId);

  ververs();
  return { error: null, success: true };
}

export async function deleteMelding(meldingId: string): Promise<MeldingFormState> {
  await assertBeheerder();
  const supabase = await createClient();
  const { error } = await supabase.from("meldingen").delete().eq("id", meldingId);
  if (error) return { error: "Verwijderen van de melding is mislukt.", success: false };

  ververs();
  return { error: null, success: true };
}

// Door elke ingelogde gebruiker: een wegklikbare melding voor jezelf verbergen.
export async function sluitMelding(meldingId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();

  const { data: melding } = await supabase
    .from("meldingen")
    .select("wegklikbaar, actief")
    .eq("id", meldingId)
    .maybeSingle();
  if (!melding?.wegklikbaar) return;

  await supabase
    .from("melding_gesloten")
    .upsert({ melding_id: meldingId, profile_id: profile.id }, { onConflict: "melding_id,profile_id", ignoreDuplicates: true });
}
