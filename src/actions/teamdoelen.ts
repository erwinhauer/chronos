"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertBeheerder } from "@/actions/admin";

export async function setTeamdoel(
  teamId: string,
  jaar: number,
  brutoBedrag: number,
  nettoBedrag: number | null
) {
  await assertBeheerder();

  if (!Number.isFinite(brutoBedrag) || brutoBedrag < 0) {
    throw new Error("Vul een geldig brutodoelbedrag in.");
  }
  if (nettoBedrag !== null && (!Number.isFinite(nettoBedrag) || nettoBedrag < 0)) {
    throw new Error("Vul een geldig nettodoelbedrag in.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teamdoelen")
    .upsert(
      { team_id: teamId, jaar, bruto_bedrag: brutoBedrag, netto_bedrag: nettoBedrag },
      { onConflict: "team_id,jaar" }
    );
  if (error) throw new Error("Opslaan van het teamdoel is mislukt.");

  revalidatePath("/instellingen");
  revalidatePath("/dashboard");
}
