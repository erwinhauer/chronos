import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, regelbedrag } from "@/lib/factuurbedragen";
import { groepeerPerProductgroep, groepeerPerLand } from "@/lib/omzet-aggregatie";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { haalLandenMap } from "@/lib/landen";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { DownloadSpecificatieKnop } from "@/components/download-specificatie-knop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/supabase/types";

const TOEGESTANE_ROLLEN: UserRole[] = ["teamleider", "finance", "beheerder", "directie"];

export default async function KlantDetailPagina({ params }: { params: Promise<{ klantId: string }> }) {
  const { klantId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !TOEGESTANE_ROLLEN.includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: klant }, { data: items }, { data: batches }, landen] = await Promise.all([
    supabase.from("klanten").select("naam, adres, valuta").eq("id", klantId).single(),
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, qty, eenheidstype, honorarium, externe_kosten, korting, factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("klant_id", klantId)
      .eq("status", "definitief")
      .order("datum", { ascending: false }),
    supabase
      .from("facturatiebatches")
      .select("id, periode_start, periode_eind, totaal_bedrag, created_at")
      .eq("klant_id", klantId)
      .order("periode_start", { ascending: false }),
    haalLandenMap(supabase),
  ]);
  if (!klant) notFound();

  const alleItems = items ?? [];
  const valuta = klant.valuta;
  const totaalGefactureerd = alleItems.reduce((som, i) => som + regelbedrag(i), 0);
  const perCategorie = groepeerPerProductgroep(alleItems);
  const perLand = groepeerPerLand(alleItems, landen, 20);

  return (
    <div className="flex flex-col gap-6">
      <SetBreadcrumb segments={[{ label: "Klanten", href: "/klanten" }, { label: klant.naam }]} />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{klant.naam}</h2>
        {klant.adres && <p className="text-xs whitespace-pre-line text-muted-foreground">{klant.adres}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totaal gefactureerd</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-figures">{euro(totaalGefactureerd, valuta)}</p>
          <p className="text-sm text-muted-foreground">
            {alleItems.length} definitieve factuuritems · {(batches ?? []).length} specificaties
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per categorie</CardTitle>
          </CardHeader>
          <CardContent>
            {perCategorie.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen gefactureerd werk.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {perCategorie.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {c.code !== "—" && <Badge variant="outline" className="mr-1.5 text-xs">{c.code}</Badge>}
                      {c.label}
                    </span>
                    <span className="tabular-figures font-medium">{euro(c.omzet, valuta)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per land</CardTitle>
          </CardHeader>
          <CardContent>
            {perLand.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen gefactureerd werk.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {perLand.map((l) => (
                  <div key={l.landNaam} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{l.landNaam}</span>
                    <span className="tabular-figures font-medium">{euro(l.omzet, valuta)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Definitieve factuuritems</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Datum</TableHead>
                <TableHead className="w-40">Dossier</TableHead>
                <TableHead className="w-32">Land</TableHead>
                <TableHead>Omschrijving</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-28 text-right">Bedrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alleItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nog geen definitieve factuuritems.
                  </TableCell>
                </TableRow>
              ) : (
                alleItems.map((item) => {
                  const dossiers = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);
                  const landenOpRegel = Array.from(new Set(dossiers.map((d) => d.land).filter(Boolean))) as string[];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(item.datum).toLocaleDateString("nl-NL")}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        {dossiers.map((d) => d.dossiernummer).join(", ")}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        {landenOpRegel.map((iso) => landNaamVoorIso(iso, landen)).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">{item.omschrijving_klant}</TableCell>
                      <TableCell className="tabular-figures">
                        {item.qty} {item.eenheidstype}
                      </TableCell>
                      <TableCell className="text-right tabular-figures">{euro(regelbedrag(item), valuta)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specificaties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(batches ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen specificaties.</p>
          ) : (
            (batches ?? []).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(batch.periode_start).toLocaleDateString("nl-NL")} –{" "}
                    {new Date(batch.periode_eind).toLocaleDateString("nl-NL")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vastgelegd op {new Date(batch.created_at).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-figures font-medium">{euro(batch.totaal_bedrag, valuta)}</span>
                  <DownloadSpecificatieKnop specificatieId={batch.id} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
