import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createFactuurItem } from "@/actions/factuuritems";
import { FactuurItemForm } from "@/components/factuuritem-form";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { haalLandenMap } from "@/lib/landen";

export default async function NieuwFactuurItemPage({
  searchParams,
}: {
  searchParams: Promise<{ klant_id?: string }>;
}) {
  const { klant_id } = await searchParams;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfile()]);
  if (!user) redirect("/login");

  const [{ data: klanten }, { data: projecten }, landen, { data: teamLidmaatschappen }, { data: laatsteItem }] =
    await Promise.all([
      supabase
        .from("klanten")
        .select("id, naam, adres, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal, valuta")
        .eq("status", "actief")
        .order("naam"),
      supabase.from("projecten").select("id, klant_id, naam, po_nummer").eq("actief", true).order("naam"),
      haalLandenMap(supabase),
      supabase.from("team_members").select("teams(id, naam)").eq("profile_id", user.id),
      supabase
        .from("factuuritems")
        .select("team_id")
        .eq("medewerker_id", user.id)
        .not("team_id", "is", null)
        .order("datum", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const projectenPerKlant: Record<string, { id: string; naam: string; po_nummer: string | null }[]> = {};
  for (const p of projecten ?? []) {
    (projectenPerKlant[p.klant_id] ??= []).push({ id: p.id, naam: p.naam, po_nummer: p.po_nummer });
  }

  const teams = (teamLidmaatschappen ?? [])
    .map((tl) => tl.teams as unknown as { id: string; naam: string } | null)
    .filter((t): t is { id: string; naam: string } => t !== null);

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: "Nieuw" }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nieuw factuuritem</h2>
        <p className="text-sm text-muted-foreground">Leg een werkzaamheid, uren of kosten vast op een dossier.</p>
      </div>
      <FactuurItemForm
        klanten={klanten ?? []}
        projectenPerKlant={projectenPerKlant}
        action={createFactuurItem}
        medewerkerId={user.id}
        voorgeselecteerdeKlantId={klant_id}
        landen={landen}
        magKlantenVerwijderen={profile?.role === "beheerder"}
        teams={teams}
        standaardTeamId={laatsteItem?.team_id ?? null}
      />
    </div>
  );
}
