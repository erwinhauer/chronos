"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";

// Signed URL (kort geldig) voor de opgeslagen factuur-/specificatie-PDF —
// zelfde rolcheck als de RLS-policy op de "facturen"-bucket.
export async function haalFactuurDownloadUrl(
  batchId: string,
  soort: "factuur" | "specificatie"
): Promise<{ url: string | null; error: string | null }> {
  const profile = await getCurrentProfile();
  if (
    profile?.role !== "finance" &&
    profile?.role !== "beheerder" &&
    profile?.role !== "directie" &&
    profile?.role !== "teamleider"
  ) {
    return { url: null, error: "Geen toegang tot facturen." };
  }

  const supabase = await createClient();
  const kolom = soort === "factuur" ? "factuur_storage_path" : "specificatie_storage_path";
  const { data: batch } = await supabase.from("facturatiebatches").select(kolom).eq("id", batchId).single();
  const pad = batch ? (batch as Record<string, string | null>)[kolom] : null;
  if (!pad) {
    return { url: null, error: "PDF is nog niet beschikbaar." };
  }

  const { data, error } = await supabase.storage.from("facturen").createSignedUrl(pad, 60);
  if (error || !data) {
    return { url: null, error: "Downloadlink aanmaken is mislukt." };
  }
  return { url: data.signedUrl, error: null };
}
