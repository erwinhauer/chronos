import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { euro, regelbedrag } from "@/lib/factuurbedragen";
import { groepeerPerProductgroep, groepeerPerLand } from "@/lib/omzet-aggregatie";
import { landNaamVoorIso } from "@/lib/dossiernummer";
import { haalLandenMap } from "@/lib/landen";
import { SetBreadcrumb } from "@/lib/breadcrumb-context";
import { KlantSpecificatiesSectie } from "@/components/klant-specificaties-sectie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        "id, datum, omschrijving_klant, qty, eenheidstype, honorarium, externe_kosten, korting, facturatiebatch_id, factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
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

  // Factuuritems horen als subitems bij hun specificatie — groeperen op
  // facturatiebatch_id. In de praktijk heeft elk definitief item er één (zie
  // genereerSpecificatie), maar een eventuele uitzondering tonen we apart
  // i.p.v. stilzwijgend te laten verdwijnen.
  type FactuurRegel = (typeof alleItems)[number];
  const itemsPerBatch: Record<string, FactuurRegel[]> = {};
  const zonderSpecificatie: FactuurRegel[] = [];
  for (const item of alleItems) {
    if (item.facturatiebatch_id) {
      (itemsPerBatch[item.facturatiebatch_id] ??= []).push(item);
    } else {
      zonderSpecificatie.push(item);
    }
  }

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

      <KlantSpecificatiesSectie
        specificaties={(batches ?? []).map((batch) => ({
          id: batch.id,
          periodeStart: batch.periode_start,
          periodeEind: batch.periode_eind,
          createdAt: batch.created_at,
          totaalBedrag: batch.totaal_bedrag,
          items: (itemsPerBatch[batch.id] ?? []).map((item) => {
            const dossiers = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);
            const landenOpRegel = Array.from(new Set(dossiers.map((d) => d.land).filter(Boolean))) as string[];
            return {
              id: item.id,
              datum: item.datum,
              omschrijvingKlant: item.omschrijving_klant,
              qty: item.qty,
              eenheidstype: item.eenheidstype,
              bedrag: regelbedrag(item),
              dossiernummers: dossiers.map((d) => d.dossiernummer),
              dossiernamen: Array.from(new Set(dossiers.map((d) => d.matter_naam).filter(Boolean))) as string[],
              landNamen: landenOpRegel.map((iso) => landNaamVoorIso(iso, landen)),
            };
          }),
        }))}
        zonderSpecificatie={zonderSpecificatie.map((item) => {
          const dossiers = (item.factuuritem_dossiers ?? []).slice().sort((a, b) => a.volgorde - b.volgorde);
          return {
            id: item.id,
            datum: item.datum,
            omschrijvingKlant: item.omschrijving_klant,
            qty: item.qty,
            eenheidstype: item.eenheidstype,
            bedrag: regelbedrag(item),
            dossiernummers: dossiers.map((d) => d.dossiernummer),
          };
        })}
        valuta={valuta}
      />
    </div>
  );
}
