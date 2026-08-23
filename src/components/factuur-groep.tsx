"use client";

import { useState } from "react";
import { Receipt, Pencil } from "lucide-react";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { euro, regelbedrag } from "@/lib/factuurbedragen";
import type { LandenMap } from "@/lib/landen";
import { VerplaatsProjectDialog } from "@/components/verplaats-project-dialog";
import { VerwijderFactuurItemDialog } from "@/components/verwijder-factuuritem-dialog";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FactuurItemStatus } from "@/lib/supabase/types";
import { tagKleurStijl } from "@/lib/tag-kleur";

type Project = { id: string; naam: string; po_nummer: string | null };

// Zelfde categorische kleurenreeks als omzet-grafiek.tsx, hier gebruikt zodat
// PO-tags van verschillende projecten meteen visueel te onderscheiden zijn.
const PROJECT_KLEUREN = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function projectKleur(index: number) {
  return PROJECT_KLEUREN[index % PROJECT_KLEUREN.length];
}

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
  magAllesBewerken = false,
  huidigeGebruikerId,
  landen,
}: {
  klantId: string;
  klantNaam: string;
  items: FactuurGroepItem[];
  projecten: Project[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  magAllesBewerken?: boolean;
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
        {secties.map((sectie, index) => (
          <ProjectSectieBlok
            key={sectie.sleutel}
            klantId={klantId}
            sectie={sectie}
            kleurIndex={index}
            projecten={projecten}
            toonHeader={toonProjectHeaders}
            toonMedewerker={toonMedewerker}
            kanFactureren={kanFactureren}
            magAllesBewerken={magAllesBewerken}
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
  kleurIndex,
  projecten,
  toonHeader,
  toonMedewerker,
  kanFactureren,
  magAllesBewerken,
  huidigeGebruikerId,
  landen,
}: {
  klantId: string;
  sectie: ProjectSectie;
  kleurIndex: number;
  projecten: Project[];
  toonHeader: boolean;
  toonMedewerker: boolean;
  kanFactureren: boolean;
  magAllesBewerken: boolean;
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

  function toggleAlle(ids: string[], checked: boolean) {
    setGeselecteerd((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
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
          Specificatie maken (0)
        </Button>
      ) : (
        <LinkButton
          size="sm"
          href={`/specificaties/nieuw?klant_id=${klantId}&item_ids=${selectie.map((s) => s.id).join(",")}`}
        >
          <Receipt className="h-4 w-4" />
          Specificatie maken ({selectie.length})
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
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  color: projectKleur(kleurIndex),
                  borderColor: `color-mix(in oklch, ${projectKleur(kleurIndex)} 40%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${projectKleur(kleurIndex)} 12%, transparent)`,
                }}
              >
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
          magAllesBewerken={magAllesBewerken}
          huidigeGebruikerId={huidigeGebruikerId}
          geselecteerd={geselecteerd}
          onToggle={toggle}
          onToggleAlle={toggleAlle}
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
  magAllesBewerken,
  huidigeGebruikerId,
  geselecteerd,
  onToggle,
  onToggleAlle,
  landen,
}: {
  items: FactuurGroepItem[];
  toonMedewerker: boolean;
  kanFactureren: boolean;
  magAllesBewerken: boolean;
  huidigeGebruikerId?: string;
  geselecteerd: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAlle: (ids: string[], checked: boolean) => void;
  landen: LandenMap;
}) {
  const selecteerbareIds = items.filter((r) => r.status === "aangemaakt").map((r) => r.id);
  const aantalGeselecteerd = selecteerbareIds.filter((id) => geselecteerd.has(id)).length;
  const alleGeselecteerd = selecteerbareIds.length > 0 && aantalGeselecteerd === selecteerbareIds.length;
  const gedeeltelijkGeselecteerd = aantalGeselecteerd > 0 && !alleGeselecteerd;

  return (
    <Table className="w-auto min-w-full table-fixed">
      <TableHeader>
        <TableRow>
          {kanFactureren && (
            <TableHead className="w-8">
              {selecteerbareIds.length > 0 && (
                <Checkbox
                  checked={alleGeselecteerd}
                  indeterminate={gedeeltelijkGeselecteerd}
                  onCheckedChange={(checked) => onToggleAlle(selecteerbareIds, checked === true)}
                  aria-label="Alles selecteren"
                />
              )}
            </TableHead>
          )}
          <TableHead className="w-24">Datum</TableHead>
          <TableHead className="w-56">Dossier</TableHead>
          <TableHead className="w-32">Land</TableHead>
          {toonMedewerker && <TableHead className="w-28">Medewerker</TableHead>}
          <TableHead className="w-64">Omschrijving</TableHead>
          <TableHead className="w-24">Qty</TableHead>
          <TableHead className="w-28 text-right">Bedrag</TableHead>
          <TableHead className="w-20 text-right">Acties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => {
          const bewerkbaar = (r.medewerkerId === huidigeGebruikerId || magAllesBewerken) && r.status === "aangemaakt";
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
                {eerste && (
                  <div className="whitespace-normal break-words text-xs text-muted-foreground">
                    {eerste.matter_naam ?? "—"}
                  </div>
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-words">
                {landen_op_regel.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {landen_op_regel.map((l) => {
                      const naam = landNaamVoorIso(l, landen);
                      return (
                        <Badge key={l} variant="outline" className="text-xs" style={tagKleurStijl(naam)}>
                          {naam}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
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
                  <div className="flex items-center justify-end gap-1.5">
                    <LinkButton
                      size="icon-sm"
                      variant="outline"
                      href={`/factuuritems/${r.id}`}
                      aria-label="Bewerken"
                    >
                      <Pencil className="h-4 w-4" />
                    </LinkButton>
                    <VerwijderFactuurItemDialog itemId={r.id} />
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
