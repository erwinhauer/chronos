"use client";

import { useState } from "react";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { STATUS_LABEL, STATUS_VARIANT, euro, regelbedrag } from "@/lib/factuurbedragen";
import { FactureerDialog } from "@/components/factureer-dialog";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FactuurItemStatus } from "@/lib/supabase/types";

export type FactuurGroepItem = {
  id: string;
  datum: string;
  dossiernummer: string;
  type_dienst: string | null;
  land: string | null;
  omschrijving_klant: string;
  eenheidstype: string;
  qty: number;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  status: FactuurItemStatus;
  medewerkerId: string;
  medewerkerNaam: string | null;
  laatstBewerktDoor: string | null;
};

export function FactuurGroep({
  klantId,
  klantNaam,
  items,
  toonMedewerker,
  kanFactureren,
  huidigeGebruikerId,
}: {
  klantId: string;
  klantNaam: string;
  items: FactuurGroepItem[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
}) {
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set());

  const subtotaalHonorarium = items.reduce((sum, r) => sum + r.honorarium, 0);
  const subtotaalKosten = items.reduce((sum, r) => sum + r.externe_kosten, 0);
  const subtotaalKorting = items.reduce((sum, r) => sum + r.korting, 0);
  const subtotaalTotaal = subtotaalHonorarium + subtotaalKosten - subtotaalKorting;

  const selectie = items
    .filter((r) => geselecteerd.has(r.id))
    .map((r) => ({ id: r.id, datum: r.datum, bedrag: regelbedrag(r) }));

  function toggle(id: string, checked: boolean) {
    setGeselecteerd((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">{klantNaam}</CardTitle>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="text-muted-foreground">
              Honorarium {euro(subtotaalHonorarium)} · Kosten van derden {euro(subtotaalKosten)} · Korting -
              {euro(subtotaalKorting)}
            </div>
            <div className="font-semibold tabular-figures">Subtotaal {euro(subtotaalTotaal)}</div>
          </div>
          {kanFactureren && <FactureerDialog klantId={klantId} klantNaam={klantNaam} selectie={selectie} />}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {kanFactureren && <TableHead className="w-8" />}
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
            {items.map((r) => {
              const bewerkbaar = r.medewerkerId === huidigeGebruikerId && r.status === "aangemaakt";
              const bedrag = regelbedrag(r);

              return (
                <TableRow key={r.id}>
                  {kanFactureren && (
                    <TableCell>
                      {r.status === "aangemaakt" && (
                        <Checkbox
                          checked={geselecteerd.has(r.id)}
                          onCheckedChange={(checked) => toggle(r.id, checked === true)}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(r.datum).toLocaleDateString("nl-NL")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium font-mono">{r.dossiernummer}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.type_dienst}
                      {r.land ? ` · ${landNaamVoorIso(r.land)}` : ""}
                    </div>
                  </TableCell>
                  {toonMedewerker && <TableCell>{r.medewerkerNaam}</TableCell>}
                  <TableCell className="max-w-xs truncate" title={r.omschrijving_klant}>
                    {r.omschrijving_klant}
                    {r.laatstBewerktDoor && (
                      <div className="text-xs font-normal text-muted-foreground">
                        Laatst bewerkt door {r.laatstBewerktDoor}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-figures">
                    {r.qty} {r.eenheidstype}
                  </TableCell>
                  <TableCell className="tabular-figures">{euro(bedrag)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} className="text-xs">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {bewerkbaar && (
                      <LinkButton size="sm" variant="outline" href={`/factuuritems/${r.id}`}>
                        Bewerken
                      </LinkButton>
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
}
