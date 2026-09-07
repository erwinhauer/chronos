import { createClient } from "@/lib/supabase/server";

// Beheerder mag uit alle actieve medewerkers kiezen; een teamleider alleen uit
// zijn eigen teamgenoten (member van minstens één team dat de teamleider ook zelf
// lid van is). Gebruikt zowel bij het aanmaken als het bewerken van een
// factuuritem, zodat een teamleider/beheerder het altijd aan een teamgenoot kan
// toewijzen — niet alleen achteraf.
export async function haalHerToewijsbareMedewerkers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: string | undefined,
  gebruikerId: string
): Promise<{ id: string; full_name: string }[] | null> {
  if (role === "beheerder") {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("actief", true).order("full_name");
    return data ?? null;
  }
  if (role === "teamleider") {
    const { data: eigenTeams } = await supabase.from("team_members").select("team_id").eq("profile_id", gebruikerId);
    const teamIds = (eigenTeams ?? []).map((t) => t.team_id);
    if (teamIds.length === 0) return [];
    const { data: leden } = await supabase
      .from("team_members")
      .select("profiles!inner(id, full_name, actief)")
      .in("team_id", teamIds);
    const map = new Map<string, { id: string; full_name: string }>();
    for (const row of leden ?? []) {
      const p = row.profiles as unknown as { id: string; full_name: string; actief: boolean };
      if (p.actief) map.set(p.id, { id: p.id, full_name: p.full_name });
    }
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
  return null;
}
