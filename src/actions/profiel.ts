"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export async function wisselActieveRol(role: UserRole) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_active_role", { target_role: role });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/", "layout");
}

export type UpdateAvatarFormState = { error: string | null; success: boolean };

export async function updateAvatarUrl(avatarUrl: string): Promise<UpdateAvatarFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Niet ingelogd.", success: false };
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) {
    return { error: "Bijwerken van de profielfoto is mislukt.", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
