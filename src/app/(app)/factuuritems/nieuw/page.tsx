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
  searchParams: Promise<{ klant_id?: string; kopie_van?: string }>;
}) {
  const { klant_id, kopie_van } = await searchParams;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfile()]);
  if (!user) redirect("/login");

  const [
    { data: klanten },
    { data: projecten },
    landen,
    { data: teamLidmaatschappen },
    { data: laatsteItem },
    { data: bronItem },
  ] = await Promise.all([
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
    // "Kopiëren": vult het formulier met de velden van een bestaand item, met
    // opzet zonder medewerker/team/datum — die horen bij wie/wanneer/voor
    // welk team de kopie wordt aangemaakt, niet bij het origineel.
    kopie_van
      ? supabase
          .from("factuuritems")
          .select(
            "klant_id, project_id, omschrijving_klant, interne_opmerking, eenheidstype, qty, prijstype, tarief, externe_kosten, korting, korting_type, korting_percentage, kantoorkosten_van_toepassing, declarabel, klanten(id, naam, adres, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal, valuta), factuuritem_dossiers(dossiernummer, matter_naam, volgorde)"
          )
          .eq("id", kopie_van)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // De klant van het bronitem blijft altijd herleidbaar/selecteerbaar, ook als
  // hij inmiddels inactief is (zelfde regel als op het bewerkscherm).
  const alleKlanten = klanten ?? [];
  const bronKlant = bronItem?.klanten;
  if (bronKlant && !alleKlanten.some((k) => k.id === bronKlant.id)) {
    alleKlanten.push(bronKlant);
  }

  const projectenPerKlant: Record<string, { id: string; naam: string; po_nummer: string | null }[]> = {};
  for (const p of projecten ?? []) {
    (projectenPerKlant[p.klant_id] ??= []).push({ id: p.id, naam: p.naam, po_nummer: p.po_nummer });
  }

  const teams = (teamLidmaatschappen ?? [])
    .map((tl) => tl.teams as unknown as { id: string; naam: string } | null)
    .filter((t): t is { id: string; naam: string } => t !== null);

  const dossiersOpBron = (bronItem?.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Factuuritems", href: "/factuuritems" }, { label: "Nieuw" }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nieuw factuuritem</h2>
        <p className="text-sm text-muted-foreground">
          {bronItem
            ? "Gekopieerd van een bestaand factuuritem — pas aan wat anders is, bv. het dossiernummer."
            : "Leg een werkzaamheid, uren of kosten vast op een dossier."}
        </p>
      </div>
      <FactuurItemForm
        klanten={alleKlanten}
        projectenPerKlant={projectenPerKlant}
        action={createFactuurItem}
        medewerkerId={user.id}
        voorgeselecteerdeKlantId={klant_id ?? bronItem?.klant_id}
        landen={landen}
        magKlantenVerwijderen={profile?.role === "beheerder"}
        teams={teams}
        standaardTeamId={laatsteItem?.team_id ?? null}
        initial={
          bronItem
            ? {
                dossiernummers: dossiersOpBron.map((d) => d.dossiernummer),
                dossiernamenPerNummer: Object.fromEntries(
                  dossiersOpBron.map((d) => [d.dossiernummer, d.matter_naam ?? ""])
                ),
                klant_id: bronItem.klant_id,
                project_id: bronItem.project_id,
                // Niet meekopiëren: het team van het origineel hoeft niet
                // geldig te zijn voor wie de kopie nu aanmaakt (zelfde reden
                // als medewerker/datum) — laat het formulier zijn eigen
                // standaardteam bepalen.
                team_id: null,
                omschrijving_klant: bronItem.omschrijving_klant,
                interne_opmerking: bronItem.interne_opmerking,
                eenheidstype: bronItem.eenheidstype,
                qty: bronItem.qty,
                prijstype: bronItem.prijstype,
                tarief: bronItem.tarief,
                externe_kosten: bronItem.externe_kosten,
                korting: bronItem.korting,
                korting_type: bronItem.korting_type,
                korting_percentage: bronItem.korting_percentage,
                kantoorkosten_van_toepassing: bronItem.kantoorkosten_van_toepassing,
                declarabel: bronItem.declarabel,
              }
            : undefined
        }
      />
    </div>
  );
}
