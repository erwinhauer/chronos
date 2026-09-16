import { createClient } from "@/lib/supabase/server";

export type HerToewijsbareMedewerker = { id: string; full_name: string; team_ids: string[] };

// Een teamleider/beheerder mag alleen kiezen uit zijn eigen teamgenoten
// (member van minstens één team dat de gebruiker ook zelf lid van is) — niet
// uit het hele kantoor. Gebruikt zowel bij het aanmaken als het bewerken van
// een factuuritem, zodat een teamleider/beheerder het altijd aan een
// teamgenoot kan toewijzen — niet alleen achteraf.
//
// `team_ids` per medewerker gaat mee zodat het formulier de teamkeuze kan
// beperken tot de team(s) waar de GEKOZEN medewerker ook echt lid van is —
// zonder dit liep je vast op de server-check (team_id moet bij de medewerker
// horen) zodra je voor een teamgenoot in maar één van je eigen meerdere teams
// een factuuritem aanmaakte terwijl de teamknop op een ander team bleef staan.
export async function haalHerToewijsbareMedewerkers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: string | undefined,
  gebruikerId: string
): Promise<HerToewijsbareMedewerker[] | null> {
  if (role !== "teamleider" && role !== "beheerder") return null;

  const { data: eigenTeams } = await supabase.from("team_members").select("team_id").eq("profile_id", gebruikerId);
  const teamIds = (eigenTeams ?? []).map((t) => t.team_id);

  if (teamIds.length === 0) {
    // Geen eigen teamlidmaatschap (bv. een beheerder die zelf niet in een
    // operationeel team zit) — dan kun je in elk geval altijd nog aan
    // jezelf toewijzen, i.p.v. een lege/kapotte keuzelijst te tonen.
    const { data: eigenProfiel } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", gebruikerId)
      .single();
    return eigenProfiel ? [{ ...eigenProfiel, team_ids: [] }] : [];
  }

  const { data: leden } = await supabase
    .from("team_members")
    .select("team_id, profiles!inner(id, full_name, actief)")
    .in("team_id", teamIds);
  const map = new Map<string, HerToewijsbareMedewerker>();
  for (const row of leden ?? []) {
    const p = row.profiles as unknown as { id: string; full_name: string; actief: boolean };
    if (!p.actief) continue;
    const bestaand = map.get(p.id) ?? { id: p.id, full_name: p.full_name, team_ids: [] };
    bestaand.team_ids.push(row.team_id);
    map.set(p.id, bestaand);
  }
  return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}
