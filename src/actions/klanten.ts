"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NieuweKlant = {
  id: string;
  naam: string;
  adres: string | null;
  patricia_id: string | null;
  kantoorkosten_actief: boolean;
  kantoorkosten_percentage: number;
  specificatietaal: "nl" | "en";
  valuta: string;
};

export type DeactiveerKlantResultaat = { error: string | null; success: boolean };

// Zonder een aparte klantenbeheerpagina is dit de enige plek waar een
// verouderde/foutief geïmporteerde klant nog uit de zoeksuggesties (o.a. de
// HubSpot-tracklist) verwijderd kan worden — een zachte verwijdering
// (status inactief), zodat bestaande factuuritems/projecten die ernaar
// verwijzen intact blijven. RLS staat dit alleen aan beheerders toe.
export async function deactiveerKlant(klantId: string): Promise<DeactiveerKlantResultaat> {
  const supabase = await createClient();
  const { error } = await supabase.from("klanten").update({ status: "inactief" }).eq("id", klantId);

  if (error) {
    return {
      error: error.code === "42501" ? "Alleen beheerders kunnen klanten verwijderen." : "Verwijderen is mislukt.",
      success: false,
    };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true };
}

export async function wisselKlantTaal(klantId: string, taal: "nl" | "en") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_klant_taal", { target_klant_id: klantId, nieuwe_taal: taal });
  if (error) {
    throw new Error("Wijzigen van de taal is mislukt.");
  }

  revalidatePath("/factuuritems");
}

export async function wisselKlantValuta(klantId: string, valuta: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_klant_valuta", { target_klant_id: klantId, nieuwe_valuta: valuta });
  if (error) {
    throw new Error("Wijzigen van de valuta is mislukt.");
  }

  revalidatePath("/factuuritems");
}
