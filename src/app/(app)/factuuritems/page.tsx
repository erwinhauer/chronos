import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { submitFactuurItem } from "@/actions/factuuritems";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FactuurItemStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<FactuurItemStatus, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  teruggestuurd: "Teruggestuurd",
  goedgekeurd: "Goedgekeurd",
  in_conceptbatch: "In conceptbatch",
  batch_goedgekeurd: "Batch goedgekeurd",
  geexporteerd: "Geëxporteerd",
  gefactureerd: "Gefactureerd",
  gecorrigeerd: "Gecorrigeerd",
};

const STATUS_VARIANT: Record<FactuurItemStatus, "default" | "secondary" | "destructive" | "outline"> = {
  concept: "outline",
  ingediend: "secondary",
  teruggestuurd: "destructive",
  goedgekeurd: "default",
  in_conceptbatch: "secondary",
  batch_goedgekeurd: "default",
  geexporteerd: "secondary",
  gefactureerd: "default",
  gecorrigeerd: "outline",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "concept", label: "Concept" },
  { value: "ingediend", label: "Ingediend" },
  { value: "teruggestuurd", label: "Teruggestuurd" },
  { value: "goedgekeurd", label: "Goedgekeurd" },
];

function euro(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

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
      "id, datum, dossiernummer, type_dienst, land, omschrijving_klant, eenheidstype, qty, honorarium, externe_kosten, korting, status, terugstuur_reden, medewerker_id, klant_id, klanten(naam), profiles!factuuritems_medewerker_id_fkey(full_name), laatst_bewerkt_door_profiel:profiles!factuuritems_laatst_bewerkt_door_fkey(full_name)"
    )
    .order("datum", { ascending: false });

  if (status) {
    query = query.eq("status", status as FactuurItemStatus);
  }

  const { data: items } = await query;
  const toonMedewerker = profile?.role !== "medewerker";

  type Item = NonNullable<typeof items>[number];
  const groepen = new Map<string, { klantNaam: string; items: Item[] }>();
  for (const item of items ?? []) {
    const klantNaam = (item.klanten as unknown as { naam: string } | null)?.naam ?? "Onbekend";
    const bestaand = groepen.get(item.klant_id);
    if (bestaand) {
      bestaand.items.push(item);
    } else {
      groepen.set(item.klant_id, { klantNaam, items: [item] });
    }
  }
  const groepenArray = Array.from(groepen.values()).sort((a, b) => a.klantNaam.localeCompare(b.klantNaam));

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
        groepenArray.map((groep) => {
          const subtotaalHonorarium = groep.items.reduce((sum, r) => sum + r.honorarium, 0);
          const subtotaalKosten = groep.items.reduce((sum, r) => sum + r.externe_kosten, 0);
          const subtotaalKorting = groep.items.reduce((sum, r) => sum + r.korting, 0);
          const subtotaalTotaal = subtotaalHonorarium + subtotaalKosten - subtotaalKorting;

          return (
            <Card key={groep.klantNaam}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="text-base">{groep.klantNaam}</CardTitle>
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">
                    Honorarium {euro(subtotaalHonorarium)} · Kosten van derden {euro(subtotaalKosten)} · Korting -
                    {euro(subtotaalKorting)}
                  </div>
                  <div className="font-semibold tabular-figures">Subtotaal {euro(subtotaalTotaal)}</div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Dossier</TableHead>
                      {toonMedewerker && <TableHead>Medewerker</TableHead>}
                      <TableHead>Omschrijving</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Bedrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groep.items.map((r) => {
                      const medewerker = r.profiles as unknown as { full_name: string } | null;
                      const laatstBewerktDoor = (
                        r.laatst_bewerkt_door_profiel as unknown as { full_name: string } | null
                      )?.full_name;
                      const bewerkbaar =
                        r.medewerker_id === profile?.id && ["concept", "teruggestuurd"].includes(r.status);
                      const regelbedrag = r.honorarium + r.externe_kosten - r.korting;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {new Date(r.datum).toLocaleDateString("nl-NL")}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.dossiernummer}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.type_dienst}
                              {r.land ? ` · ${landNaamVoorIso(r.land)}` : ""}
                            </div>
                          </TableCell>
                          {toonMedewerker && <TableCell>{medewerker?.full_name}</TableCell>}
                          <TableCell className="max-w-xs truncate" title={r.omschrijving_klant}>
                            {r.omschrijving_klant}
                            {laatstBewerktDoor && (
                              <div className="text-xs font-normal text-muted-foreground">
                                Laatst bewerkt door {laatstBewerktDoor}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="tabular-figures">
                            {r.qty} {r.eenheidstype}
                          </TableCell>
                          <TableCell className="tabular-figures">{euro(regelbedrag)}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[r.status]} className="text-xs">
                              {STATUS_LABEL[r.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {bewerkbaar && (
                              <div className="flex justify-end gap-2">
                                <LinkButton size="sm" variant="outline" href={`/factuuritems/${r.id}`}>
                                  Bewerken
                                </LinkButton>
                                {r.status === "concept" && (
                                  <form action={submitFactuurItem.bind(null, r.id)}>
                                    <Button size="sm" type="submit">
                                      Indienen
                                    </Button>
                                  </form>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
