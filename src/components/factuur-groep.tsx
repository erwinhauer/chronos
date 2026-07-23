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
  dossiers: { dossiernummer: string; type_dienst: string | null; land: string | null }[];
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
  projectId: string | null;
  projectNaam: string | null;
  projectPoNummer: string | null;
};

type ProjectSectie = {
  sleutel: string;
  projectNaam: string | null;
  projectPoNummer: string | null;
  items: FactuurGroepItem[];
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
  const subtotaalHonorarium = items.reduce((sum, r) => sum + r.honorarium, 0);
  const subtotaalKosten = items.reduce((sum, r) => sum + r.externe_kosten, 0);
  const subtotaalKorting = items.reduce((sum, r) => sum + r.korting, 0);
  const subtotaalTotaal = subtotaalHonorarium + subtotaalKosten - subtotaalKorting;

  const sectieMap = new Map<string, ProjectSectie>();
  for (const item of items) {
    const sleutel = item.projectId ?? "__geen__";
    const bestaand = sectieMap.get(sleutel);
    if (bestaand) bestaand.items.push(item);
    else
      sectieMap.set(sleutel, {
        sleutel,
        projectNaam: item.projectNaam,
        projectPoNummer: item.projectPoNummer,
        items: [item],
      });
  }
  const secties = Array.from(sectieMap.values()).sort((a, b) => (a.projectNaam ?? "").localeCompare(b.projectNaam ?? ""));
  const toonProjectHeaders = secties.length > 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">{klantNaam}</CardTitle>
        <div className="text-right text-sm">
          <div className="text-muted-foreground">
            Honorarium {euro(subtotaalHonorarium)} · Kosten van derden {euro(subtotaalKosten)} · Korting -
            {euro(subtotaalKorting)}
          </div>
          <div className="font-semibold tabular-figures">Subtotaal {euro(subtotaalTotaal)}</div>
        </div>
      </CardHeader>
      <CardContent className={toonProjectHeaders ? "flex flex-col gap-6 p-4" : "p-0"}>
        {secties.map((sectie) => (
          <ProjectSectieBlok
            key={sectie.sleutel}
            klantId={klantId}
            klantNaam={klantNaam}
            sectie={sectie}
            toonHeader={toonProjectHeaders}
            toonMedewerker={toonMedewerker}
            kanFactureren={kanFactureren}
            huidigeGebruikerId={huidigeGebruikerId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ProjectSectieBlok({
  klantId,
  klantNaam,
  sectie,
  toonHeader,
  toonMedewerker,
  kanFactureren,
  huidigeGebruikerId,
}: {
  klantId: string;
  klantNaam: string;
  sectie: ProjectSectie;
  toonHeader: boolean;
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
}) {
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set());

  const selectie = sectie.items
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

  const factureerKnop = kanFactureren && (
    <FactureerDialog klantId={klantId} klantNaam={klantNaam} selectie={selectie} />
  );

  return (
    <div className="flex flex-col gap-2">
      {toonHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {sectie.projectNaam ?? "Geen project"}
            {sectie.projectPoNummer && (
              <Badge variant="outline" className="text-xs">
                PO: {sectie.projectPoNummer}
              </Badge>
            )}
          </div>
          {factureerKnop}
        </div>
      ) : (
        factureerKnop && <div className="flex justify-end px-4 pt-4">{factureerKnop}</div>
      )}
      <div className={toonHeader ? "overflow-hidden rounded-lg border border-border" : undefined}>
        <FactuurItemsTabel
          items={sectie.items}
          toonMedewerker={toonMedewerker}
          kanFactureren={kanFactureren}
          huidigeGebruikerId={huidigeGebruikerId}
          geselecteerd={geselecteerd}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}

function FactuurItemsTabel({
  items,
  toonMedewerker,
  kanFactureren,
  huidigeGebruikerId,
  geselecteerd,
  onToggle,
}: {
  items: FactuurGroepItem[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
  geselecteerd: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
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
          const [eerste, ...rest] = r.dossiers;

          return (
            <TableRow key={r.id}>
              {kanFactureren && (
                <TableCell>
                  {r.status === "aangemaakt" && (
                    <Checkbox
                      checked={geselecteerd.has(r.id)}
                      onCheckedChange={(checked) => onToggle(r.id, checked === true)}
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(r.datum).toLocaleDateString("nl-NL")}
              </TableCell>
              <TableCell>
                {eerste && (
                  <div className="flex items-center gap-1.5">
                    <div className="font-medium">{eerste.dossiernummer}</div>
                    {rest.length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        title={rest.map((d) => d.dossiernummer).join(", ")}
                      >
                        +{rest.length}
                      </Badge>
                    )}
                  </div>
                )}
                {eerste && (
                  <div className="text-xs text-muted-foreground">
                    {eerste.type_dienst}
                    {eerste.land ? ` · ${landNaamVoorIso(eerste.land)}` : ""}
                  </div>
                )}
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
  );
}
