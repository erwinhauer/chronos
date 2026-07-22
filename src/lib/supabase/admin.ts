import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role client — bypast RLS volledig. Alleen voor acties die de normale
// client-API niet biedt (zoals auth.admin.createUser). Elke actie die dit
// gebruikt moet zelf eerst de aanroeper als beheerder verifiëren via de
// gewone sessie-gebonden client, want RLS is verder de enige beveiligingslaag.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in de omgeving — nodig voor beheeracties.");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
