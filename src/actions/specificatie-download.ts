"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { genereerSpecificatiePdf } from "@/lib/specificatie-pdf";
import { haalLandenMap } from "@/lib/landen";
import { berekenFactuurtotalen, round2 } from "@/lib/factuurbedragen";

export type SpecificatiePdfResultaat = { base64: string | null; filename: string | null; error: string | null };

function sanitiseerBestandsnaamdeel(waarde: string): string {
  return waarde.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function specificatieBestandsnaam(klantNaam: string, taal: "nl" | "en", aangemaaktOp: string): string {
  const datum = new Date(aangemaaktOp);
  const yyyymmdd = `${datum.getFullYear()}${String(datum.getMonth() + 1).padStart(2, "0")}${String(datum.getDate()).padStart(2, "0")}`;
  const titel = taal === "nl" ? "Specificatie factuur" : "Specification Invoice";
  return `${yyyymmdd} ${sanitiseerBestandsnaamdeel(klantNaam)} ${titel}.pdf`;
}

// Genereert de specificatie-PDF on-demand (geen Storage meer nodig — de PDF is
// een pure functie van de vastgelegde specificatie + haar items).
export async function genereerSpecificatiePdfBase64(specificatieId: string): Promise<SpecificatiePdfResultaat> {
  const profile = await getCurrentProfile();
  if (
    profile?.role !== "finance" &&
    profile?.role !== "beheerder" &&
    profile?.role !== "directie" &&
    profile?.role !== "teamleider"
  ) {
    return { base64: null, filename: null, error: "Geen toegang tot specificaties." };
  }

  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("facturatiebatches")
    .select(
      "*, klanten(*), projecten(naam, po_nummer), profiles!facturatiebatches_goedgekeurd_door_fkey(full_name)"
    )
    .eq("id", specificatieId)
    .single();
  if (!batch) {
    return { base64: null, filename: null, error: "Specificatie niet gevonden." };
  }
  const klant = batch.klanten;
  if (!klant) {
    return { base64: null, filename: null, error: "Klant niet gevonden." };
  }
  // Bevroren kolomkeuze van de batch zelf, niet de (later wijzigbare)
  // standaardinstelling van de klant — zie [id]/page.tsx voor dezelfde regel.
  const specificatieKlant = {
    ...klant,
    kolom_externe_kosten_zichtbaar: batch.kolom_externe_kosten_zichtbaar,
    kolom_korting_zichtbaar: batch.kolom_korting_zichtbaar,
  };
  const project = batch.projecten as unknown as { naam: string; po_nummer: string | null } | null;
  const voorbereidDoor = (batch.profiles as unknown as { full_name: string } | null)?.full_name ?? "—";

  const [{ data: items }, landen] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("facturatiebatch_id", batch.id)
      .order("datum", { ascending: true }),
    haalLandenMap(supabase),
  ]);

  const specificatieItems = (items ?? []).map((item) => ({
    id: item.id,
    datum: item.datum,
    omschrijving_klant: item.omschrijving_klant,
    eenheidstype: item.eenheidstype,
    qty: item.qty,
    tarief: item.tarief,
    honorarium: item.honorarium,
    externe_kosten: item.externe_kosten,
    korting: item.korting,
    medewerkerNaam: (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
    dossiers: item.factuuritem_dossiers ?? [],
  }));
  const totalen = {
    totaal_honorarium: batch.totaal_honorarium,
    totaal_externe_kosten: batch.totaal_externe_kosten,
    totaal_korting: batch.totaal_korting,
    totaal_kantoorkosten: batch.totaal_kantoorkosten,
    extra_korting: batch.extra_korting,
    totaal_bedrag: batch.totaal_bedrag,
  };

  try {
    const buffer = await genereerSpecificatiePdf({
      klant: specificatieKlant,
      project,
      voorbereidDoor,
      periodeStart: batch.periode_start,
      periodeEind: batch.periode_eind,
      aangemaaktOp: batch.created_at,
      landen,
      items: specificatieItems,
      totalen,
      valuta: batch.valuta,
    });
    const filename = specificatieBestandsnaam(klant.naam, klant.specificatietaal, batch.created_at);
    return { base64: buffer.toString("base64"), filename, error: null };
  } catch {
    return { base64: null, filename: null, error: "Genereren van de PDF is mislukt." };
  }
}

// Downloadbaar concept vóórdat de specificatie definitief wordt gemaakt —
// dezelfde selectie/berekening als genereerSpecificatie (src/actions/specificaties.ts),
// maar zonder facturatiebatch aan te maken. Altijd met een "CONCEPT"-watermerk,
// zodat een gebruiker dit voorbeeld niet per ongeluk als definitieve specificatie
// verstuurt in plaats van de workflow af te ronden.
export async function genereerConceptSpecificatiePdfBase64(input: {
  klant_id: string;
  itemIds: string[];
  periode_start: string;
  periode_eind: string;
  extra_korting: number;
  kolom_externe_kosten_zichtbaar?: boolean;
  kolom_korting_zichtbaar?: boolean;
}): Promise<SpecificatiePdfResultaat> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder" && profile?.role !== "teamleider") {
    return { base64: null, filename: null, error: "Geen toegang tot specificaties." };
  }
  if (!input.klant_id || input.itemIds.length === 0) {
    return { base64: null, filename: null, error: "Selecteer minimaal één factuuritem." };
  }

  const supabase = await createClient();

  const { data: klant } = await supabase.from("klanten").select("*").eq("id", input.klant_id).single();
  if (!klant) {
    return { base64: null, filename: null, error: "Klant niet gevonden." };
  }
  // Concept-voorbeeld gebruikt de kolomkeuze die de gebruiker nu op het
  // aanmaakscherm heeft gezet, met de klant se eigen instelling als fallback.
  const specificatieKlant = {
    ...klant,
    kolom_externe_kosten_zichtbaar: input.kolom_externe_kosten_zichtbaar ?? klant.kolom_externe_kosten_zichtbaar,
    kolom_korting_zichtbaar: input.kolom_korting_zichtbaar ?? klant.kolom_korting_zichtbaar,
  };

  const [{ data: items }, landen] = await Promise.all([
    supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, kantoorkosten_van_toepassing, project_id, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, matter_naam, volgorde)"
      )
      .eq("klant_id", input.klant_id)
      .eq("status", "aangemaakt")
      .in("id", input.itemIds)
      .order("datum", { ascending: true }),
    haalLandenMap(supabase),
  ]);

  if (!items || items.length !== input.itemIds.length) {
    return {
      base64: null,
      filename: null,
      error: "Een of meer geselecteerde items zijn niet meer beschikbaar.",
    };
  }

  const projectId = items[0]?.project_id ?? null;
  const { data: project } = projectId
    ? await supabase.from("projecten").select("naam, po_nummer").eq("id", projectId).maybeSingle()
    : { data: null };

  const ruw = berekenFactuurtotalen(items, klant.kantoorkosten_percentage);
  const extraKorting = round2(input.extra_korting) || 0;
  if (extraKorting > ruw.subtotaalVoorExtraKorting) {
    return { base64: null, filename: null, error: "Extra korting kan niet groter zijn dan het bedrag van de specificatie." };
  }
  const totalen = {
    totaal_honorarium: ruw.totaalHonorarium,
    totaal_externe_kosten: ruw.totaalExterneKosten,
    totaal_korting: ruw.totaalKorting,
    totaal_kantoorkosten: ruw.totaalKantoorkosten,
    extra_korting: extraKorting,
    totaal_bedrag: round2(ruw.subtotaalVoorExtraKorting - extraKorting),
  };

  const specificatieItems = items.map((item) => ({
    id: item.id,
    datum: item.datum,
    omschrijving_klant: item.omschrijving_klant,
    eenheidstype: item.eenheidstype,
    qty: item.qty,
    tarief: item.tarief,
    honorarium: item.honorarium,
    externe_kosten: item.externe_kosten,
    korting: item.korting,
    medewerkerNaam: (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
    dossiers: item.factuuritem_dossiers ?? [],
  }));

  try {
    const aangemaaktOp = new Date().toISOString();
    const buffer = await genereerSpecificatiePdf({
      klant: specificatieKlant,
      project,
      voorbereidDoor: profile?.full_name ?? "—",
      periodeStart: input.periode_start,
      periodeEind: input.periode_eind,
      aangemaaktOp,
      landen,
      items: specificatieItems,
      totalen,
      valuta: klant.valuta,
      watermerk: klant.specificatietaal === "nl" ? "CONCEPT" : "DRAFT",
    });
    const filename = specificatieBestandsnaam(klant.naam, klant.specificatietaal, aangemaaktOp).replace(
      /\.pdf$/,
      " (concept).pdf"
    );
    return { base64: buffer.toString("base64"), filename, error: null };
  } catch {
    return { base64: null, filename: null, error: "Genereren van de concept-PDF is mislukt." };
  }
}
