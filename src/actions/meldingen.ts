"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { assertBeheerder } from "@/actions/admin";
import { huidigeSessieId } from "@/lib/supabase/sessie";
import { amsterdamNaarDate } from "@/lib/amsterdam-tijd";
import type { Database } from "@/lib/supabase/types";

type MeldingSoort = Database["public"]["Enums"]["melding_soort"];

export type MeldingFormState = { error: string | null; success: boolean };

const SOORTEN: MeldingSoort[] = ["info", "waarschuwing", "urgent"];
const MAX_TEKST = 500;

function leesInvoer(
  formData: FormData
): { soort: MeldingSoort; tekst: string; wegklikbaar: boolean; verloopt_op: string | null } | { error: string } {
  const soort = String(formData.get("soort") ?? "") as MeldingSoort;
  const tekst = String(formData.get("tekst") ?? "").trim();
  if (!SOORTEN.includes(soort)) return { error: "Kies een soort melding." };
  if (!tekst) return { error: "Typ de tekst van de melding." };
  if (tekst.length > MAX_TEKST) return { error: `De tekst mag maximaal ${MAX_TEKST} tekens zijn.` };

  // Leeg = de melding verloopt niet. De invoer is Amsterdamse tijd.
  const ruwVerloop = String(formData.get("verloopt_op") ?? "").trim();
  let verloopt_op: string | null = null;
  if (ruwVerloop) {
    const datum = amsterdamNaarDate(ruwVerloop);
    if (!datum) return { error: "Vul een geldige verloopdatum en tijd in." };
    if (datum.getTime() <= Date.now()) return { error: "De verloopdatum en tijd liggen in het verleden." };
    verloopt_op = datum.toISOString();
  }

  return { soort, tekst, wegklikbaar: formData.get("wegklikbaar") === "on", verloopt_op };
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

// Na een wijziging krijgt iedereen de melding weer te zien, ook wie hem in deze sessie al had gezien.
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
  await supabase.from("melding_gezien").delete().eq("melding_id", meldingId);

  ververs();
  return { error: null, success: true };
}

export async function setMeldingActief(meldingId: string, actief: boolean): Promise<MeldingFormState> {
  await assertBeheerder();
  const supabase = await createClient();
  const { error } = await supabase.from("meldingen").update({ actief }).eq("id", meldingId);
  if (error) return { error: "Bijwerken van de melding is mislukt.", success: false };
  // Opnieuw aanzetten toont de melding weer aan iedereen.
  if (actief) await supabase.from("melding_gezien").delete().eq("melding_id", meldingId);

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

// Verlopen meldingen mogen uit de lijst van de beheerder. Gebruikers zien ze al niet meer
// (verloopt_op in de leespolicy en in het layout); dit ruimt de rijen op wanneer een beheerder
// Instellingen opent.
export async function purgeVerlopenMeldingen(): Promise<void> {
  await assertBeheerder();
  const supabase = await createClient();
  await supabase.from("meldingen").delete().lte("verloopt_op", new Date().toISOString());
}

// Door elke ingelogde gebruiker: legt vast dat deze wegklikbare meldingen in de huidige
// inlogsessie zijn getoond, zodat ze in deze sessie niet opnieuw verschijnen.
export async function markeerMeldingenGezien(meldingIds: string[]): Promise<void> {
  if (meldingIds.length === 0) return;
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  const sessieId = await huidigeSessieId(supabase);
  if (!sessieId) return;

  await supabase.from("melding_gezien").upsert(
    meldingIds.map((melding_id) => ({ melding_id, profile_id: profile.id, sessie_id: sessieId })),
    { onConflict: "melding_id,profile_id,sessie_id", ignoreDuplicates: true }
  );
}
