"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDossiernummer, DOSSIERNUMMER_VOORBEELD } from "@/lib/dossiernummer";

export type FactuurItemFormState = { error: string | null; success: boolean };

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseInput(formData: FormData) {
  const klant_id = String(formData.get("klant_id") ?? "");
  const dossiernummer = String(formData.get("dossiernummer") ?? "").trim().toUpperCase();
  const datum = String(formData.get("datum") ?? "");
  const omschrijving_klant = String(formData.get("omschrijving_klant") ?? "").trim();
  const interne_opmerking = String(formData.get("interne_opmerking") ?? "").trim();
  const eenheidstype = String(formData.get("eenheidstype") ?? "uren").trim();
  const qty = round1(Number(formData.get("qty") ?? 0));
  const tarief = formData.get("tarief") ? round2(Number(formData.get("tarief"))) : null;
  const vastHonorarium = formData.get("vast_honorarium_actief") === "on";
  const handmatigHonorarium = formData.get("vast_honorarium")
    ? round2(Number(formData.get("vast_honorarium")))
    : null;
  const externe_kosten = round2(Number(formData.get("externe_kosten") ?? 0));
  const korting = round2(Number(formData.get("korting") ?? 0));
  const kantoorkosten_van_toepassing = formData.get("kantoorkosten_van_toepassing") === "on";
  const declarabel = formData.get("declarabel") === "on";

  return {
    klant_id,
    dossiernummer,
    datum,
    omschrijving_klant,
    interne_opmerking: interne_opmerking || null,
    eenheidstype,
    qty,
    tarief,
    vastHonorarium,
    handmatigHonorarium,
    externe_kosten,
    korting,
    kantoorkosten_van_toepassing,
    declarabel,
  };
}

function mapDbError(error: { code?: string; message: string }) {
  if (error.code === "23514") {
    return "Korting mag niet hoger zijn dan honorarium plus externe kosten.";
  }
  if (error.code === "42501") {
    return "Dit factuuritem kan niet meer worden gewijzigd (al definitief/gefactureerd).";
  }
  return "Opslaan is mislukt. Controleer de ingevulde gegevens en probeer het opnieuw.";
}

function tariefWijktAf(voorgesteld: number | null | undefined, ingevuld: number | null) {
  if (voorgesteld === null || voorgesteld === undefined || ingevuld === null) return false;
  return Math.abs(voorgesteld - ingevuld) > 0.001;
}

export async function createFactuurItem(
  _prevState: FactuurItemFormState,
  formData: FormData
): Promise<FactuurItemFormState> {
  const input = parseInput(formData);

  if (!input.klant_id || !input.datum || !input.omschrijving_klant || input.qty <= 0) {
    return { error: "Klant, datum, omschrijving en aantal (groter dan 0) zijn verplicht.", success: false };
  }
  const parsed = parseDossiernummer(input.dossiernummer);
  if (!parsed) {
    return {
      error: `Dossiernummer heeft niet het verwachte formaat (bv. ${DOSSIERNUMMER_VOORBEELD}).`,
      success: false,
    };
  }
  if (!input.vastHonorarium && (input.tarief === null || input.tarief < 0)) {
    return { error: "Vul een geldig tarief in, of kies voor een vast honorarium.", success: false };
  }
  if (input.vastHonorarium && input.handmatigHonorarium === null) {
    return { error: "Vul het vaste honorarium in.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Je sessie is verlopen. Log opnieuw in.", success: false };
  }

  const { data: voorgesteldTarief } = await supabase.rpc("resolve_tarief", {
    p_klant_id: input.klant_id,
    p_medewerker_id: user.id,
    p_datum: input.datum,
  });

  const honorarium = input.vastHonorarium ? input.handmatigHonorarium! : round2(input.qty * (input.tarief ?? 0));

  if (round2(input.korting) > round2(honorarium + input.externe_kosten)) {
    return { error: "Korting mag niet hoger zijn dan honorarium plus externe kosten.", success: false };
  }

  const afwijkend = !input.vastHonorarium && tariefWijktAf(voorgesteldTarief, input.tarief);

  const { error } = await supabase.from("factuuritems").insert({
    klant_id: input.klant_id,
    medewerker_id: user.id,
    dossiernummer: input.dossiernummer,
    type_dienst: parsed.typeLabel,
    land: parsed.landIso,
    datum: input.datum,
    omschrijving_klant: input.omschrijving_klant,
    interne_opmerking: input.interne_opmerking,
    eenheidstype: input.eenheidstype,
    qty: input.qty,
    tarief: input.vastHonorarium ? null : input.tarief,
    tarief_afwijkend: afwijkend,
    honorarium,
    externe_kosten: input.externe_kosten,
    korting: input.korting,
    kantoorkosten_van_toepassing: input.kantoorkosten_van_toepassing,
    declarabel: input.declarabel,
  });

  if (error) {
    return { error: mapDbError(error), success: false };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  redirect("/factuuritems");
}

export async function updateFactuurItem(
  id: string,
  _prevState: FactuurItemFormState,
  formData: FormData
): Promise<FactuurItemFormState> {
  const input = parseInput(formData);

  if (!input.klant_id || !input.datum || !input.omschrijving_klant || input.qty <= 0) {
    return { error: "Klant, datum, omschrijving en aantal (groter dan 0) zijn verplicht.", success: false };
  }
  const parsed = parseDossiernummer(input.dossiernummer);
  if (!parsed) {
    return {
      error: `Dossiernummer heeft niet het verwachte formaat (bv. ${DOSSIERNUMMER_VOORBEELD}).`,
      success: false,
    };
  }
  if (!input.vastHonorarium && (input.tarief === null || input.tarief < 0)) {
    return { error: "Vul een geldig tarief in, of kies voor een vast honorarium.", success: false };
  }
  if (input.vastHonorarium && input.handmatigHonorarium === null) {
    return { error: "Vul het vaste honorarium in.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Je sessie is verlopen. Log opnieuw in.", success: false };
  }

  const { data: voorgesteldTarief } = await supabase.rpc("resolve_tarief", {
    p_klant_id: input.klant_id,
    p_medewerker_id: user.id,
    p_datum: input.datum,
  });

  const honorarium = input.vastHonorarium ? input.handmatigHonorarium! : round2(input.qty * (input.tarief ?? 0));

  if (round2(input.korting) > round2(honorarium + input.externe_kosten)) {
    return { error: "Korting mag niet hoger zijn dan honorarium plus externe kosten.", success: false };
  }

  const afwijkend = !input.vastHonorarium && tariefWijktAf(voorgesteldTarief, input.tarief);

  const { error } = await supabase
    .from("factuuritems")
    .update({
      klant_id: input.klant_id,
      dossiernummer: input.dossiernummer,
      type_dienst: parsed.typeLabel,
      land: parsed.landIso,
      datum: input.datum,
      omschrijving_klant: input.omschrijving_klant,
      interne_opmerking: input.interne_opmerking,
      eenheidstype: input.eenheidstype,
      qty: input.qty,
      tarief: input.vastHonorarium ? null : input.tarief,
      tarief_afwijkend: afwijkend,
      honorarium,
      externe_kosten: input.externe_kosten,
      korting: input.korting,
      kantoorkosten_van_toepassing: input.kantoorkosten_van_toepassing,
      declarabel: input.declarabel,
    })
    .eq("id", id);

  if (error) {
    return { error: mapDbError(error), success: false };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  redirect("/factuuritems");
}
