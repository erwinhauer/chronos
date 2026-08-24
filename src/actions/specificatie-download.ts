"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { genereerSpecificatiePdf } from "@/lib/specificatie-pdf";
import { haalLandenMap } from "@/lib/landen";

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
    .select("*, klanten(*)")
    .eq("id", specificatieId)
    .single();
  if (!batch) {
    return { base64: null, filename: null, error: "Specificatie niet gevonden." };
  }
  const klant = batch.klanten;
  if (!klant) {
    return { base64: null, filename: null, error: "Klant niet gevonden." };
  }

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
      klant,
      periodeStart: batch.periode_start,
      periodeEind: batch.periode_eind,
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
