import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type LandenMap = Record<string, { nl: string; en: string }>;

export async function haalLandenMap(supabase: SupabaseClient<Database>): Promise<LandenMap> {
  const { data } = await supabase.from("landcodes").select("iso_code, naam_nl, naam_en");
  const map: LandenMap = {};
  for (const rij of data ?? []) {
    map[rij.iso_code] = { nl: rij.naam_nl, en: rij.naam_en };
  }
  return map;
}
