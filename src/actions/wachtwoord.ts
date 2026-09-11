"use server";

import { createClient } from "@/lib/supabase/server";
import { wachtwoordFoutmelding } from "@/lib/wachtwoord-validatie";

export type WachtwoordState = { error: string | null; success: boolean };

export async function wijzigEigenWachtwoord(
  _prevState: WachtwoordState,
  formData: FormData
): Promise<WachtwoordState> {
  const nieuw = String(formData.get("nieuw_wachtwoord") ?? "");
  const bevestig = String(formData.get("bevestig_wachtwoord") ?? "");

  if (nieuw !== bevestig) {
    return { error: "De wachtwoorden komen niet overeen.", success: false };
  }

  const foutmelding = wachtwoordFoutmelding(nieuw);
  if (foutmelding) {
    return { error: foutmelding, success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Je sessie is verlopen. Log opnieuw in.", success: false };
  }

  // Expliciet de bestaande metadata meegeven i.p.v. alleen must_change_password
  // — voorkomt dataverlies mocht Supabase's updateUser ooit vervangen i.p.v.
  // samenvoegen.
  const { error } = await supabase.auth.updateUser({
    password: nieuw,
    data: { ...user.user_metadata, must_change_password: false },
  });

  if (error) {
    return { error: "Wijzigen van het wachtwoord is mislukt. Probeer het opnieuw.", success: false };
  }

  return { error: null, success: true };
}
