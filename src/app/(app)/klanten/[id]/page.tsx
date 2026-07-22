import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
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

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: klant }, { data: items }] = await Promise.all([
    supabase.from("klanten").select("*").eq("id", id).single(),
    supabase.from("factuuritems").select("honorarium, externe_kosten, korting, status, declarabel").eq("klant_id", id),
  ]);

  if (!klant) notFound();

  const rows = items ?? [];
  const nogTeFactureren = rows
    .filter((r) => isNogTeFactureren(r.status, r.declarabel))
    .reduce((sum, r) => sum + regelbedrag(r), 0);
  const gefactureerd = rows.filter((r) => isGefactureerd(r.status)).reduce((sum, r) => sum + regelbedrag(r), 0);

  const perStatus = new Map<FactuurItemStatus, { aantal: number; bedrag: number }>();
  for (const r of rows) {
    const bestaand = perStatus.get(r.status) ?? { aantal: 0, bedrag: 0 };
    bestaand.aantal += 1;
    bestaand.bedrag += regelbedrag(r);
    perStatus.set(r.status, bestaand);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{klant.naam}</h2>
          <p className="text-sm text-muted-foreground">
            {klant.contactpersoon_naam} &middot; {klant.contact_email}
          </p>
        </div>
        <Badge variant={klant.status === "actief" ? "default" : "outline"}>
          {klant.status === "actief" ? "Actief" : "Inactief"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nog te factureren</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures">{euro(nogTeFactureren)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gefactureerd</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-figures">{euro(gefactureerd)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uitsplitsing per status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Aantal</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perStatus.size > 0 ? (
                Array.from(perStatus.entries()).map(([status, v]) => (
                  <TableRow key={status}>
                    <TableCell>{STATUS_LABEL[status]}</TableCell>
                    <TableCell className="tabular-figures">{v.aantal}</TableCell>
                    <TableCell className="text-right tabular-figures">{euro(v.bedrag)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Nog geen factuuritems voor deze klant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Klantinstellingen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Taal factuur/specificatie: </span>
            {klant.specificatietaal === "nl" ? "Nederlands" : "Engels"}
          </div>
          <div>
            <span className="text-muted-foreground">Specificatietype: </span>
            <span className="capitalize">{klant.specificatietype}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kantoorkosten: </span>
            {klant.kantoorkosten_actief ? `${klant.kantoorkosten_percentage}%` : "Niet van toepassing"}
          </div>
          <div>
            <span className="text-muted-foreground">Valuta: </span>
            {klant.valuta}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
