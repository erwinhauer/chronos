import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { euro, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { FactuurGroepenTabel, type FactuurGroepSamenvatting } from "@/components/factuur-groepen-tabel";
import { LinkButton } from "@/components/link-button";
import { StatIcon } from "@/components/stat-icon";
import { Card, CardContent } from "@/components/ui/card";

export default async function FactuuritemsPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("factuuritems")
    .select("id, klant_id, datum, honorarium, externe_kosten, korting, status, declarabel, klanten(naam, patricia_id)")
    .eq("status", "aangemaakt")
    .order("datum", { ascending: false });

  const groepenMap = new Map<string, FactuurGroepSamenvatting>();
  for (const item of items ?? []) {
    const klant = item.klanten as unknown as { naam: string; patricia_id: string | null } | null;
    const bestaand = groepenMap.get(item.klant_id) ?? {
      klantId: item.klant_id,
      klantNaam: klant?.naam ?? "Onbekend",
      patriciaId: klant?.patricia_id ?? null,
      aantalItems: 0,
      oudsteDatum: item.datum,
      bedrag: 0,
    };
    bestaand.aantalItems += 1;
    bestaand.bedrag += regelbedrag(item);
    if (item.datum < bestaand.oudsteDatum) bestaand.oudsteDatum = item.datum;
    groepenMap.set(item.klant_id, bestaand);
  }
  const groepen = Array.from(groepenMap.values()).sort((a, b) => a.klantNaam.localeCompare(b.klantNaam));

  const totaalOpenstaand = (items ?? [])
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Factuuritems</h2>
          <p className="text-sm text-muted-foreground">
            Factuuritems gegroepeerd per klant. Klik op een klant voor de volledige lijst.
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

      <FactuurGroepenTabel groepen={groepen} />
    </div>
  );
}
