import type { SupabaseClient } from "@supabase/supabase-js";

// Het id van de huidige inlogsessie (claim `session_id` in het Supabase-token). Het blijft gelijk
// bij het verversen van het token en verandert na opnieuw inloggen. Null als het token geen
// sessie-id bevat; aanroepers behandelen dat als "geen sessie bekend".
export async function huidigeSessieId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.session_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
