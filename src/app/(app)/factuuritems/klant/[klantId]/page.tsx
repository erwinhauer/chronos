import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { haalLandenMap } from "@/lib/landen";
import { FactuurGroep, type FactuurGroepItem } from "@/components/factuur-groep";
import { LinkButton } from "@/components/link-button";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";

export default async function FactuuritemsPerKlantPagina({
  params,
}: {
  params: Promise<{ klantId: string }>;
}) {
  const { klantId } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const magAllesBewerken =
    profile?.role === "beheerder" ||
    (profile?.role === "teamleider" &&
      (await supabase.rpc("team_services_klant", { target_klant_id: klantId })).data === true);

  const [{ data: klant }, { data: items }, { data: projecten }, landen] = await Promise.all([
    supabase.from("klanten").select("naam").eq("id", klantId).single(),
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, honorarium, externe_kosten, korting, status, declarabel, medewerker_id, klant_id, project_id, projecten(naam, po_nummer, omschrijving), profiles!factuuritems_medewerker_id_fkey(full_name, initialen), laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("klant_id", klantId)
      .eq("status", "aangemaakt")
      .order("datum", { ascending: false }),
    supabase.from("projecten").select("id, klant_id, naam, po_nummer").eq("klant_id", klantId).eq("actief", true).order("naam"),
    haalLandenMap(supabase),
  ]);

  if (!klant) notFound();

  const toonMedewerker = profile?.role !== "medewerker";
  const kanFactureren =
    profile?.role === "finance" || profile?.role === "beheerder" || profile?.role === "teamleider";

  const genormaliseerd: FactuurGroepItem[] = (items ?? []).map((item) => {
    const project = item.projecten as unknown as {
      naam: string;
      po_nummer: string | null;
      omschrijving: string | null;
    } | null;
    const medewerker = item.profiles as unknown as { full_name: string; initialen: string | null } | null;
    const laatstBewerktDoor =
      (item.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null)?.full_name ?? null;
    const dossiers = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);

    return {
      id: item.id,
      datum: item.datum,
      dossiers,
      omschrijving_klant: item.omschrijving_klant,
      eenheidstype: item.eenheidstype,
      qty: item.qty,
      honorarium: item.honorarium,
      externe_kosten: item.externe_kosten,
      korting: item.korting,
      status: item.status,
      medewerkerId: item.medewerker_id,
      medewerkerNaam: medewerker?.full_name ?? null,
      medewerkerInitialen: medewerker?.initialen ?? null,
      laatstBewerktDoor,
      projectId: item.project_id,
      projectNaam: project?.naam ?? null,
      projectPoNummer: project?.po_nummer ?? null,
      projectOmschrijving: project?.omschrijving ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: klant.naam }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{klant.naam}</h2>
          <p className="text-sm text-muted-foreground">Openstaande factuuritems voor deze klant.</p>
        </div>
        <LinkButton href={`/factuuritems/nieuw?klant_id=${klantId}`}>
          <Plus className="h-4 w-4" />
          Nieuw factuuritem
        </LinkButton>
      </div>

      {genormaliseerd.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Geen openstaande factuuritems.</p>
      ) : (
        <FactuurGroep
          klantId={klantId}
          klantNaam={klant.naam}
          items={genormaliseerd}
          projecten={projecten ?? []}
          toonMedewerker={toonMedewerker}
          kanFactureren={kanFactureren}
          magAllesBewerken={magAllesBewerken}
          huidigeGebruikerId={profile?.id}
          landen={landen}
        />
      )}
    </div>
  );
}
