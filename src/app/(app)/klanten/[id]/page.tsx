import { notFound } from "next/navigation";
import Link from "next/link";
import { Receipt, PiggyBank } from "lucide-react";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { STATUS_LABEL, euro, isGefactureerd, isNogTeFactureren, regelbedrag } from "@/lib/factuurbedragen";
import { EditKlantDialog } from "@/components/edit-klant-dialog";
import { ProjectenKaart } from "@/components/projecten-kaart";
import { StatIcon } from "@/components/stat-icon";
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

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [profile, { data: klant }, { data: items }, { data: facturen }, { data: projecten }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("klanten").select("*").eq("id", id).single(),
    supabase.from("factuuritems").select("honorarium, externe_kosten, korting, status, declarabel").eq("klant_id", id),
    supabase
      .from("facturatiebatches")
      .select("id, periode_start, periode_eind, totaal_bedrag, valuta, created_at")
      .eq("klant_id", id)
      .order("periode_start", { ascending: false }),
    supabase.from("projecten").select("id, naam, po_nummer, actief").eq("klant_id", id).order("naam"),
  ]);

  if (!klant) notFound();

  const magProjectenBeheren =
    profile?.role === "beheerder" ||
    (profile?.role === "teamleider" &&
      (await supabase.rpc("team_services_klant", { target_klant_id: id })).data === true);

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
      <SetBreadcrumb segments={[{ label: "Klanten", href: "/klanten" }, { label: klant.naam }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{klant.naam}</h2>
          {klant.subtitel && <p className="text-sm text-muted-foreground">{klant.subtitel}</p>}
          <p className="text-sm text-muted-foreground">
            {klant.contactpersoon_naam} &middot; {klant.contact_email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={klant.status === "actief" ? "default" : "outline"}>
            {klant.status === "actief" ? "Actief" : "Inactief"}
          </Badge>
          {profile?.role === "beheerder" && <EditKlantDialog klant={klant} />}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={Receipt} tint="warning" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nog te factureren</p>
              <div className="text-2xl font-semibold tabular-figures text-warning">{euro(nogTeFactureren)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <StatIcon icon={PiggyBank} tint="success" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Gefactureerd</p>
              <div className="text-2xl font-semibold tabular-figures text-success">{euro(gefactureerd)}</div>
            </div>
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
          <CardTitle className="text-base">Facturen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead className="text-right">Specificatie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturen && facturen.length > 0 ? (
                facturen.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      {new Date(f.periode_start).toLocaleDateString("nl-NL")} –{" "}
                      {new Date(f.periode_eind).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right tabular-figures">{euro(f.totaal_bedrag)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/facturatiebatches/${f.id}`} className="text-sm text-primary hover:underline">
                        Bekijken
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Nog geen facturen voor deze klant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {magProjectenBeheren && <ProjectenKaart klantId={id} projecten={projecten ?? []} />}

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
          <div>
            <span className="text-muted-foreground">Kosten van derden: </span>
            {klant.kolom_externe_kosten_zichtbaar ? "Apart getoond op de specificatie" : "Meegenomen in het honorarium"}
          </div>
          <div>
            <span className="text-muted-foreground">Facturen versturen: </span>
            {klant.verzending_toegestaan ? "Per e-mail" : "Alleen PDF (eigen billing-systeem)"}
          </div>
          {klant.opmerkingen && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Opmerkingen: </span>
              <span className="whitespace-pre-line">{klant.opmerkingen}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
