"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertBeheerder } from "@/actions/admin";

export async function setTeamdoel(teamId: string, jaar: number, bedrag: number) {
  await assertBeheerder();

  if (!Number.isFinite(bedrag) || bedrag < 0) {
    throw new Error("Vul een geldig doelbedrag in.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teamdoelen")
    .upsert({ team_id: teamId, jaar, bedrag }, { onConflict: "team_id,jaar" });
  if (error) throw new Error("Opslaan van het teamdoel is mislukt.");

  revalidatePath("/instellingen");
  revalidatePath("/dashboard");
}
