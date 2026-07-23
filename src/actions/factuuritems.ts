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
  const project_id = String(formData.get("project_id") ?? "").trim() || null;
  const dossiernummers = Array.from(
    new Set(
      formData
        .getAll("dossiernummers")
        .map((v) => String(v).trim().toUpperCase())
        .filter(Boolean)
    )
  );
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
    project_id,
    dossiernummers,
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

type DossierParseResultaat =
  | { ok: false; error: string }
  | { ok: true; rijen: { dossiernummer: string; type_dienst: string; land: string; volgorde: number }[] };

function parseDossiernummers(dossiernummers: string[]): DossierParseResultaat {
  if (dossiernummers.length === 0) {
    return { ok: false, error: "Voeg minimaal één dossiernummer toe." };
  }
  const rijen: { dossiernummer: string; type_dienst: string; land: string; volgorde: number }[] = [];
  for (const [index, dossiernummer] of dossiernummers.entries()) {
    const parsed = parseDossiernummer(dossiernummer);
    if (!parsed) {
      return {
        ok: false,
        error: `Dossiernummer "${dossiernummer}" heeft niet het verwachte formaat (bv. ${DOSSIERNUMMER_VOORBEELD}).`,
      };
    }
    rijen.push({ dossiernummer, type_dienst: parsed.typeLabel, land: parsed.landIso, volgorde: index });
  }
  return { ok: true, rijen };
}

export async function createFactuurItem(
  _prevState: FactuurItemFormState,
  formData: FormData
): Promise<FactuurItemFormState> {
  const input = parseInput(formData);

  if (!input.klant_id || !input.datum || !input.omschrijving_klant || input.qty <= 0) {
    return { error: "Klant, datum, omschrijving en aantal (groter dan 0) zijn verplicht.", success: false };
  }
  const dossiers = parseDossiernummers(input.dossiernummers);
  if (!dossiers.ok) {
    return { error: dossiers.error, success: false };
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

  const { data: item, error } = await supabase
    .from("factuuritems")
    .insert({
      klant_id: input.klant_id,
      project_id: input.project_id,
      medewerker_id: user.id,
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
    .select("id")
    .single();

  if (error || !item) {
    return { error: mapDbError(error ?? { message: "onbekend" }), success: false };
  }

  const { error: dossierError } = await supabase
    .from("factuuritem_dossiers")
    .insert(dossiers.rijen.map((d) => ({ ...d, factuuritem_id: item.id })));

  if (dossierError) {
    await supabase.from("factuuritems").delete().eq("id", item.id);
    return { error: "Opslaan van de dossiernummers is mislukt. Probeer het opnieuw.", success: false };
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
  const dossiers = parseDossiernummers(input.dossiernummers);
  if (!dossiers.ok) {
    return { error: dossiers.error, success: false };
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
      project_id: input.project_id,
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

  const { error: deleteError } = await supabase.from("factuuritem_dossiers").delete().eq("factuuritem_id", id);
  if (deleteError) {
    return { error: "Bijwerken van de dossiernummers is mislukt.", success: false };
  }
  const { error: dossierError } = await supabase
    .from("factuuritem_dossiers")
    .insert(dossiers.rijen.map((d) => ({ ...d, factuuritem_id: id })));
  if (dossierError) {
    return { error: "Bijwerken van de dossiernummers is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  redirect("/factuuritems");
}

export type VerplaatsFormState = { error: string | null; success: boolean };

export async function moveFactuuritemsToProject(
  klantId: string,
  _prevState: VerplaatsFormState,
  formData: FormData
): Promise<VerplaatsFormState> {
  const itemIds = formData.getAll("item_ids").map(String);
  const projectId = String(formData.get("project_id") ?? "").trim() || null;

  if (itemIds.length === 0) {
    return { error: "Selecteer minimaal één factuuritem.", success: false };
  }

  const supabase = await createClient();

  const { data: items, error: itemsError } = await supabase
    .from("factuuritems")
    .select("id")
    .eq("klant_id", klantId)
    .eq("status", "aangemaakt")
    .in("id", itemIds);

  if (itemsError) {
    return { error: "Ophalen van de geselecteerde items is mislukt.", success: false };
  }
  if (!items || items.length !== itemIds.length) {
    return {
      error: "Een of meer geselecteerde items zijn niet meer beschikbaar (mogelijk al gefactureerd).",
      success: false,
    };
  }

  const { error } = await supabase
    .from("factuuritems")
    .update({ project_id: projectId })
    .in(
      "id",
      items.map((i) => i.id)
    );

  if (error) {
    return { error: "Verplaatsen naar het project is mislukt.", success: false };
  }

  revalidatePath("/factuuritems");
  return { error: null, success: true };
}
