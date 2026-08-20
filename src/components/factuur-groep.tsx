"use client";

import { useState } from "react";
import { Receipt, Pencil } from "lucide-react";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { euro, regelbedrag } from "@/lib/factuurbedragen";
import type { LandenMap } from "@/lib/landen";
import { VerplaatsProjectDialog } from "@/components/verplaats-project-dialog";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FactuurItemStatus } from "@/lib/supabase/types";

type Project = { id: string; naam: string; po_nummer: string | null };

export type FactuurGroepItem = {
  id: string;
  datum: string;
  dossiers: { dossiernummer: string; type_dienst: string | null; land: string | null; matter_naam: string | null }[];
  omschrijving_klant: string;
  eenheidstype: string;
  qty: number;
  honorarium: number;
  externe_kosten: number;
  korting: number;
  status: FactuurItemStatus;
  medewerkerId: string;
  medewerkerNaam: string | null;
  medewerkerInitialen: string | null;
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
  projecten,
  toonMedewerker,
  kanFactureren,
  huidigeGebruikerId,
  landen,
}: {
  klantId: string;
  klantNaam: string;
  items: FactuurGroepItem[];
  projecten: Project[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
  landen: LandenMap;
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
            sectie={sectie}
            projecten={projecten}
            toonHeader={toonProjectHeaders}
            toonMedewerker={toonMedewerker}
            kanFactureren={kanFactureren}
            huidigeGebruikerId={huidigeGebruikerId}
            landen={landen}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ProjectSectieBlok({
  klantId,
  sectie,
  projecten,
  toonHeader,
  toonMedewerker,
  kanFactureren,
  huidigeGebruikerId,
  landen,
}: {
  klantId: string;
  sectie: ProjectSectie;
  projecten: Project[];
  toonHeader: boolean;
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
  landen: LandenMap;
}) {
  const [geselecteerd, setGeselecteerd] = useState<Set<string>>(new Set());

  // Altijd filteren tegen sectie.items (niet de kale Set): als een item na een
  // verplaatsing niet meer in deze sectie zit maar de sectie-key (projectId)
  // ongewijzigd bleef, behoudt React de geselecteerd-state — zonder deze
  // filter zou dat een "geest"-id laten meesturen dat niet meer zichtbaar is.
  const selectie = sectie.items
    .filter((r) => geselecteerd.has(r.id))
    .map((r) => ({ id: r.id, datum: r.datum, bedrag: regelbedrag(r) }));
  const huidigProjectId = sectie.items[0]?.projectId ?? null;

  function toggle(id: string, checked: boolean) {
    setGeselecteerd((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const acties = kanFactureren && (
    <div className="flex flex-wrap items-center gap-2">
      <VerplaatsProjectDialog
        klantId={klantId}
        itemIds={selectie.map((s) => s.id)}
        projecten={projecten}
        huidigProjectId={huidigProjectId}
      />
      {selectie.length === 0 ? (
        <Button size="sm" disabled>
          <Receipt className="h-4 w-4" />
          Factureren (0)
        </Button>
      ) : (
        <LinkButton
          size="sm"
          href={`/facturatiebatches/nieuw?klant_id=${klantId}&item_ids=${selectie.map((s) => s.id).join(",")}`}
        >
          <Receipt className="h-4 w-4" />
          Factureren ({selectie.length})
        </LinkButton>
      )}
    </div>
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
          {acties}
        </div>
      ) : (
        acties && <div className="flex justify-end px-4 pt-4">{acties}</div>
      )}
      <div className={toonHeader ? "overflow-hidden rounded-lg border border-border" : undefined}>
        <FactuurItemsTabel
          items={sectie.items}
          toonMedewerker={toonMedewerker}
          kanFactureren={kanFactureren}
          huidigeGebruikerId={huidigeGebruikerId}
          geselecteerd={geselecteerd}
          onToggle={toggle}
          landen={landen}
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
  landen,
}: {
  items: FactuurGroepItem[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  huidigeGebruikerId?: string;
  geselecteerd: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  landen: LandenMap;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          {kanFactureren && <TableHead className="w-8" />}
          <TableHead className="w-24">Datum</TableHead>
          <TableHead className="w-56">Dossier</TableHead>
          <TableHead className="w-32">Land</TableHead>
          {toonMedewerker && <TableHead className="w-16">Medewerker</TableHead>}
          <TableHead>Omschrijving</TableHead>
          <TableHead className="w-24">Qty</TableHead>
          <TableHead className="w-28 text-right">Bedrag</TableHead>
          <TableHead className="w-12 text-right">Acties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => {
          const bewerkbaar = r.medewerkerId === huidigeGebruikerId && r.status === "aangemaakt";
          const bedrag = regelbedrag(r);
          const [eerste, ...rest] = r.dossiers;
          const landen_op_regel = Array.from(new Set(r.dossiers.map((d) => d.land).filter(Boolean))) as string[];

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
                {eerste && <div className="text-xs text-muted-foreground">{eerste.matter_naam ?? "—"}</div>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {landen_op_regel.length > 0 ? landen_op_regel.map((l) => landNaamVoorIso(l, landen)).join(", ") : "—"}
              </TableCell>
              {toonMedewerker && (
                <TableCell>
                  {r.medewerkerInitialen && <Badge variant="secondary">{r.medewerkerInitialen}</Badge>}
                </TableCell>
              )}
              <TableCell className="whitespace-normal break-words" title={r.omschrijving_klant}>
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
              <TableCell className="text-right tabular-figures">{euro(bedrag)}</TableCell>
              <TableCell className="text-right">
                {bewerkbaar && (
                  <LinkButton
                    size="icon-sm"
                    variant="outline"
                    href={`/factuuritems/${r.id}`}
                    aria-label="Bewerken"
                  >
                    <Pencil className="h-4 w-4" />
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
