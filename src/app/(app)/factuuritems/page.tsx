import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { FactuurGroep, type FactuurGroepItem } from "@/components/factuur-groep";
import { LinkButton } from "@/components/link-button";
import { StatIcon } from "@/components/stat-icon";
import { Card, CardContent } from "@/components/ui/card";

export default async function FactuuritemsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: items }, { data: projecten }] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, honorarium, externe_kosten, korting, status, declarabel, medewerker_id, klant_id, project_id, klanten(naam), projecten(naam, po_nummer), profiles!factuuritems_medewerker_id_fkey(full_name), laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, volgorde)"
      )
      .eq("status", "aangemaakt")
      .order("datum", { ascending: false }),
    supabase.from("projecten").select("id, klant_id, naam, po_nummer").eq("actief", true).order("naam"),
  ]);

  const projectenPerKlant: Record<string, { id: string; naam: string; po_nummer: string | null }[]> = {};
  for (const p of projecten ?? []) {
    (projectenPerKlant[p.klant_id] ??= []).push({ id: p.id, naam: p.naam, po_nummer: p.po_nummer });
  }

  const toonMedewerker = profile?.role !== "medewerker";
  const kanFactureren = profile?.role === "finance" || profile?.role === "beheerder";

  const groepen = new Map<string, { klantNaam: string; items: FactuurGroepItem[] }>();
  for (const item of items ?? []) {
    const klantNaam = (item.klanten as unknown as { naam: string } | null)?.naam ?? "Onbekend";
    const project = item.projecten as unknown as { naam: string; po_nummer: string | null } | null;
    const medewerkerNaam = (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null;
    const laatstBewerktDoor =
      (item.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null)?.full_name ?? null;
    const dossiers = (item.factuuritem_dossiers ?? [])
      .slice()
      .sort((a, b) => a.volgorde - b.volgorde)
      .map((d) => ({ dossiernummer: d.dossiernummer, type_dienst: d.type_dienst, land: d.land }));

    const genormaliseerd: FactuurGroepItem = {
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
      medewerkerNaam,
      laatstBewerktDoor,
      projectId: item.project_id,
      projectNaam: project?.naam ?? null,
      projectPoNummer: project?.po_nummer ?? null,
    };

    const bestaand = groepen.get(item.klant_id);
    if (bestaand) {
      bestaand.items.push(genormaliseerd);
    } else {
      groepen.set(item.klant_id, { klantNaam, items: [genormaliseerd] });
    }
  }
  const groepenArray = Array.from(groepen.entries())
    .map(([klantId, groep]) => ({ klantId, ...groep }))
    .sort((a, b) => a.klantNaam.localeCompare(b.klantNaam));

  const totaalOpenstaand = (items ?? [])
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Factuuritems</h2>
          <p className="text-sm text-muted-foreground">
            {toonMedewerker
              ? "Factuuritems van het team binnen jouw rol, gegroepeerd per klant."
              : "Jouw factuuritems van werkzaamheden, uren en kosten, gegroepeerd per klant."}
          </p>
        </div>
        <LinkButton href="/factuuritems/nieuw">
          <Plus className="h-4 w-4" />
          Nieuw factuuritem
        </LinkButton>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <StatIcon icon={Receipt} tint="warning" />
            <span className="text-sm text-muted-foreground">Totaal openstaand (alle klanten)</span>
          </div>
          <span className="text-xl font-semibold tabular-figures text-warning">{euro(totaalOpenstaand)}</span>
        </CardContent>
      </Card>

      {groepenArray.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Geen openstaande factuuritems.
          </CardContent>
        </Card>
      ) : (
        groepenArray.map((groep) => (
          <FactuurGroep
            key={groep.klantId}
            klantId={groep.klantId}
            klantNaam={groep.klantNaam}
            items={groep.items}
            projecten={projectenPerKlant[groep.klantId] ?? []}
            toonMedewerker={toonMedewerker}
            kanFactureren={kanFactureren}
            huidigeGebruikerId={profile?.id}
          />
        ))
      )}
    </div>
  );
}
