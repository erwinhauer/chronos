"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertBeheerder } from "@/actions/admin";

export type FunctieFormState = { error: string | null; success: boolean };

const MAX_UURTARIEF = 10000;

function vandaagAmsterdam(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

function dagVoor(datum: string): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function leesInvoer(formData: FormData): { naam: string; uurtarief: number } | { error: string } {
  const naam = String(formData.get("naam") ?? "").trim();
  const ruwTarief = String(formData.get("uurtarief") ?? "").trim().replace(",", ".");
  if (!naam) return { error: "Geef de functie een naam." };
  if (naam.length > 80) return { error: "De naam van de functie mag maximaal 80 tekens zijn." };
  const uurtarief = Number(ruwTarief);
  if (!ruwTarief || !Number.isFinite(uurtarief) || uurtarief < 0 || uurtarief > MAX_UURTARIEF) {
    return { error: "Vul een uurtarief in tussen 0 en 10.000." };
  }
  return { naam, uurtarief: Math.round(uurtarief * 100) / 100 };
}

// Een tariefwijziging raakt nooit bestaande registraties en blijft terug te vinden in de auditlog:
// het lopende tarief krijgt een einddatum (gisteren) en een nieuwe rij geldt vanaf vandaag. Is het
// lopende tarief vandaag zelf pas ingegaan, dan wordt het aangepast i.p.v. een tweede rij te maken.
async function zetFunctieTarief(
  supabase: Awaited<ReturnType<typeof createClient>>,
  functieId: string,
  uurtarief: number,
  gebruikerId: string
): Promise<string | null> {
  const vandaag = vandaagAmsterdam();
  const { data: lopend, error: leesFout } = await supabase
    .from("tarieven")
    .select("id, tarief, ingangsdatum")
    .eq("functie_id", functieId)
    .is("einddatum", null)
    .order("ingangsdatum", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (leesFout) return "Het huidige tarief van de functie kon niet worden gelezen.";

  if (lopend && Math.abs(lopend.tarief - uurtarief) < 0.001) return null;

  if (lopend && lopend.ingangsdatum >= vandaag) {
    const { error } = await supabase.from("tarieven").update({ tarief: uurtarief }).eq("id", lopend.id);
    return error ? "Bijwerken van het tarief is mislukt." : null;
  }

  if (lopend) {
    const { error } = await supabase
      .from("tarieven")
      .update({ einddatum: dagVoor(vandaag) })
      .eq("id", lopend.id);
    if (error) return "Bijwerken van het tarief is mislukt.";
  }

  const { error } = await supabase.from("tarieven").insert({
    functie_id: functieId,
    tarief: uurtarief,
    ingangsdatum: vandaag,
    created_by: gebruikerId,
  });
  return error ? "Opslaan van het tarief is mislukt." : null;
}

export async function createFunctie(_prev: FunctieFormState, formData: FormData): Promise<FunctieFormState> {
  const beheerder = await assertBeheerder();
  const invoer = leesInvoer(formData);
  if ("error" in invoer) return { error: invoer.error, success: false };

  const supabase = await createClient();
  const { data: functie, error } = await supabase.from("functies").insert({ naam: invoer.naam }).select("id").single();
  if (error || !functie) {
    return {
      error: error?.code === "23505" ? "Er bestaat al een functie met deze naam." : "Aanmaken van de functie is mislukt.",
      success: false,
    };
  }

  const tariefFout = await zetFunctieTarief(supabase, functie.id, invoer.uurtarief, beheerder.id);
  if (tariefFout) {
    // Een functie zonder tarief is niet bruikbaar: terugdraaien.
    await supabase.from("functies").delete().eq("id", functie.id);
    return { error: tariefFout, success: false };
  }

  revalidatePath("/instellingen");
  return { error: null, success: true };
}

export async function updateFunctie(
  functieId: string,
  _prev: FunctieFormState,
  formData: FormData
): Promise<FunctieFormState> {
  const beheerder = await assertBeheerder();
  const invoer = leesInvoer(formData);
  if ("error" in invoer) return { error: invoer.error, success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("functies").update({ naam: invoer.naam }).eq("id", functieId);
  if (error) {
    return {
      error: error.code === "23505" ? "Er bestaat al een functie met deze naam." : "Bijwerken van de functie is mislukt.",
      success: false,
    };
  }

  const tariefFout = await zetFunctieTarief(supabase, functieId, invoer.uurtarief, beheerder.id);
  if (tariefFout) return { error: tariefFout, success: false };

  revalidatePath("/instellingen");
  return { error: null, success: true };
}

export async function deleteFunctie(functieId: string): Promise<FunctieFormState> {
  await assertBeheerder();
  const supabase = await createClient();

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("functie_id", functieId);
  if (count && count > 0) {
    return {
      error: `Deze functie is nog gekoppeld aan ${count} ${count === 1 ? "gebruiker" : "gebruikers"}. Koppel die eerst aan een andere functie.`,
      success: false,
    };
  }

  const { error } = await supabase.from("functies").delete().eq("id", functieId);
  if (error) return { error: "Verwijderen van de functie is mislukt.", success: false };

  revalidatePath("/instellingen");
  return { error: null, success: true };
}
