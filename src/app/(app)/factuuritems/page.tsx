import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { FactuurGroep, type FactuurGroepItem } from "@/components/factuur-groep";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent } from "@/components/ui/card";
import type { FactuurItemStatus } from "@/lib/supabase/types";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "aangemaakt", label: "Aangemaakt" },
  { value: "definitief", label: "Definitief" },
];

export default async function FactuuritemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("factuuritems")
    .select(
      "id, datum, dossiernummer, type_dienst, land, omschrijving_klant, eenheidstype, qty, honorarium, externe_kosten, korting, status, declarabel, medewerker_id, klant_id, klanten(naam), profiles!factuuritems_medewerker_id_fkey(full_name), laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name)"
    )
    .order("datum", { ascending: false });

  if (status) {
    query = query.eq("status", status as FactuurItemStatus);
  }

  const { data: items } = await query;
  const toonMedewerker = profile?.role !== "medewerker";
  const kanFactureren = profile?.role === "finance" || profile?.role === "beheerder";

  const groepen = new Map<string, { klantNaam: string; items: FactuurGroepItem[] }>();
  for (const item of items ?? []) {
    const klantNaam = (item.klanten as unknown as { naam: string } | null)?.naam ?? "Onbekend";
    const medewerkerNaam = (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null;
    const laatstBewerktDoor =
      (item.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null)?.full_name ?? null;

    const genormaliseerd: FactuurGroepItem = {
      id: item.id,
      datum: item.datum,
      dossiernummer: item.dossiernummer,
      type_dienst: item.type_dienst,
      land: item.land,
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
          <span className="text-sm text-muted-foreground">Totaal openstaand (alle klanten)</span>
          <span className="text-xl font-semibold tabular-figures text-warning">{euro(totaalOpenstaand)}</span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <LinkButton
            key={f.value}
            size="sm"
            variant={status === f.value || (!status && f.value === "") ? "secondary" : "ghost"}
            href={f.value ? `/factuuritems?status=${f.value}` : "/factuuritems"}
          >
            {f.label}
          </LinkButton>
        ))}
      </div>

      {groepenArray.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Geen factuuritems gevonden.
          </CardContent>
        </Card>
      ) : (
        groepenArray.map((groep) => (
          <FactuurGroep
            key={groep.klantId}
            klantId={groep.klantId}
            klantNaam={groep.klantNaam}
            items={groep.items}
            toonMedewerker={toonMedewerker}
            kanFactureren={kanFactureren}
            huidigeGebruikerId={profile?.id}
          />
        ))
      )}
    </div>
  );
}
