"use server";

import { createClient } from "@/lib/supabase/server";
import { zoekDossierInfo, type PatriciaDossierInfo } from "@/lib/patricia";
import type { NieuweKlant } from "@/actions/klanten";

/**
 * Client-aanroepbare wrapper rond de Patricia-lookup, gebruikt door
 * FactuurItemForm om bij het toevoegen van een dossiernummer de dossiernaam
 * en klant te herleiden. `null` betekent: dossier bestaat niet in Patricia
 * (of Patricia is onbereikbaar) — de aanroeper moet dit als validatiefout
 * behandelen, niet als "sla dit veld over".
 */
export async function haalPatriciaDossierInfo(dossiernummer: string): Promise<PatriciaDossierInfo | null> {
  return zoekDossierInfo(dossiernummer);
}

/**
 * "Chronos-klanten" bestaan niet los van Patricia — elke klant is een
 * contact met de rol Client op een Patricia-dossier. Deze functie zoekt de
 * bestaande `klanten`-rij op basis van Patricia's ACTOR_ID (`patricia_id`,
 * de blijvende matching-sleutel), en maakt er anders automatisch één aan met
 * Patricia's naam/adres en verstandige standaardinstellingen.
 */
export async function vindOfMaakKlantVoorPatriciaActor(
  actorId: string,
  naam: string,
  adres: string | null
): Promise<{ success: true; klant: NieuweKlant } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: bestaand } = await supabase
    .from("klanten")
    .select("id, naam, adres, patricia_id, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal, valuta")
    .eq("patricia_id", actorId)
    .maybeSingle();
  if (bestaand) {
    return { success: true, klant: bestaand };
  }

  const { data: nieuw, error } = await supabase
    .from("klanten")
    .insert({ naam, adres, patricia_id: actorId, status: "actief" })
    .select("id, naam, adres, patricia_id, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal, valuta")
    .single();
  if (error || !nieuw) {
    return { success: false, error: error?.message ?? "Klant aanmaken vanuit Patricia is mislukt." };
  }
  return { success: true, klant: nieuw };
}
