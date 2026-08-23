"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDossiernummer } from "@/lib/dossiernummer";
import type { PrijsType, KortingType } from "@/lib/supabase/types";

export type FactuurItemFormState = { error: string | null; success: boolean };

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseInput(formData: FormData) {
  const klant_id = String(formData.get("klant_id") ?? "").trim();
  const project_id = String(formData.get("project_id") ?? "").trim() || null;
  const dossiernummers = Array.from(
    new Set(formData.getAll("dossiernummers").map((v) => String(v).trim().toUpperCase()).filter(Boolean))
  );
  const datum = String(formData.get("datum") ?? "");
  const omschrijving_klant = String(formData.get("omschrijving_klant") ?? "").trim();
  const interne_opmerking = String(formData.get("interne_opmerking") ?? "").trim();
  const eenheidstype = String(formData.get("eenheidstype") ?? "uren").trim();
  const qty = round1(Number(formData.get("qty") ?? 0));
  const prijstype = String(formData.get("prijstype") ?? "") as PrijsType | "";
  const tarief = formData.get("tarief") ? round2(Number(formData.get("tarief"))) : null;
  const externe_kosten = round2(Number(formData.get("externe_kosten") ?? 0));
  const korting_type = (String(formData.get("korting_type") ?? "bedrag")) as KortingType;
  const korting_bedrag_ingevoerd = formData.get("korting") ? round2(Number(formData.get("korting"))) : 0;
  const korting_percentage = formData.get("korting_percentage")
    ? round2(Number(formData.get("korting_percentage")))
    : null;
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
    prijstype,
    tarief,
    externe_kosten,
    korting_type,
    korting_bedrag_ingevoerd,
    korting_percentage,
    kantoorkosten_van_toepassing,
    declarabel,
  };
}

function mapDbError(error: { code?: string; message: string }) {
  if (error.code === "23514") {
    return "Korting mag niet hoger zijn dan het honorarium.";
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

type DossierResolutie =
  | { ok: false; error: string }
  | {
      ok: true;
      rijen: { dossiernummer: string; type_dienst: string; land: string; matter_naam: string | null; volgorde: number }[];
    };

// Zolang er geen Patricia-koppeling is, typt de gebruiker het dossiernummer
// vrij in — alleen het format wordt (opnieuw, server-side) gevalideerd via
// parseDossiernummer(). matter_naam is nog niet af te leiden en blijft null
// tot die koppeling er is.
function resolveDossiers(dossiernummers: string[]): DossierResolutie {
  if (dossiernummers.length === 0) {
    return { ok: false, error: "Voeg minimaal één dossier toe." };
  }

  const rijen: { dossiernummer: string; type_dienst: string; land: string; matter_naam: string | null; volgorde: number }[] =
    [];
  for (const [index, dossiernummer] of dossiernummers.entries()) {
    const parsed = parseDossiernummer(dossiernummer);
    if (!parsed) {
      return { ok: false, error: `Dossiernummer "${dossiernummer}" heeft niet het verwachte formaat.` };
    }
    rijen.push({
      dossiernummer,
      type_dienst: parsed.typeLabel,
      land: parsed.landIso,
      matter_naam: null,
      volgorde: index,
    });
  }

  return { ok: true, rijen };
}

async function klantBestaat(supabase: Awaited<ReturnType<typeof createClient>>, klant_id: string): Promise<boolean> {
  if (!klant_id) return false;
  const { data } = await supabase.from("klanten").select("id").eq("id", klant_id).single();
  return Boolean(data);
}

function valideerGedeeld(input: ReturnType<typeof parseInput>): string | null {
  if (!input.datum || !input.omschrijving_klant || input.qty <= 0) {
    return "Datum, omschrijving en aantal (groter dan 0) zijn verplicht.";
  }
  if (input.prijstype !== "uren" && input.prijstype !== "vast_honorarium") {
    return "Kies of dit uren of een vast honorarium (fixed fee) is.";
  }
  if (input.tarief === null || input.tarief < 0) {
    return "Vul een geldige prijs in.";
  }
  if (input.korting_type === "percentage") {
    if (input.korting_percentage === null || input.korting_percentage < 0 || input.korting_percentage > 100) {
      return "Vul een geldig kortingspercentage (0-100) in.";
    }
  }
  return null;
}

export async function createFactuurItem(
  _prevState: FactuurItemFormState,
  formData: FormData
): Promise<FactuurItemFormState> {
  const input = parseInput(formData);

  const gedeeldeFout = valideerGedeeld(input);
  if (gedeeldeFout) {
    return { error: gedeeldeFout, success: false };
  }
  // valideerGedeeld dekt dit al af; herhaald zodat TypeScript prijstype hier ook narrowt.
  if (input.prijstype !== "uren" && input.prijstype !== "vast_honorarium") {
    return { error: "Kies of dit uren of een vast honorarium (fixed fee) is.", success: false };
  }

  if (!input.klant_id) {
    return { error: "Kies een klant.", success: false };
  }

  const supabase = await createClient();
  const dossiers = resolveDossiers(input.dossiernummers);
  if (!dossiers.ok) {
    return { error: dossiers.error, success: false };
  }
  if (!(await klantBestaat(supabase, input.klant_id))) {
    return { error: "De gekozen klant bestaat niet (meer).", success: false };
  }

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

  const honorarium = round2(input.qty * (input.tarief ?? 0));
  const korting =
    input.korting_type === "percentage"
      ? round2(honorarium * ((input.korting_percentage ?? 0) / 100))
      : input.korting_bedrag_ingevoerd;

  if (round2(korting) > round2(honorarium)) {
    return { error: "Korting mag niet hoger zijn dan het honorarium.", success: false };
  }

  const afwijkend = input.prijstype === "uren" && tariefWijktAf(voorgesteldTarief, input.tarief);

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
      prijstype: input.prijstype,
      tarief: input.tarief,
      tarief_afwijkend: afwijkend,
      honorarium,
      externe_kosten: input.externe_kosten,
      korting,
      korting_type: input.korting_type,
      korting_percentage: input.korting_type === "percentage" ? input.korting_percentage : null,
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

  const gedeeldeFout = valideerGedeeld(input);
  if (gedeeldeFout) {
    return { error: gedeeldeFout, success: false };
  }
  // valideerGedeeld dekt dit al af; herhaald zodat TypeScript prijstype hier ook narrowt.
  if (input.prijstype !== "uren" && input.prijstype !== "vast_honorarium") {
    return { error: "Kies of dit uren of een vast honorarium (fixed fee) is.", success: false };
  }

  if (!input.klant_id) {
    return { error: "Kies een klant.", success: false };
  }

  const supabase = await createClient();
  const dossiers = resolveDossiers(input.dossiernummers);
  if (!dossiers.ok) {
    return { error: dossiers.error, success: false };
  }
  if (!(await klantBestaat(supabase, input.klant_id))) {
    return { error: "De gekozen klant bestaat niet (meer).", success: false };
  }

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

  const honorarium = round2(input.qty * (input.tarief ?? 0));
  const korting =
    input.korting_type === "percentage"
      ? round2(honorarium * ((input.korting_percentage ?? 0) / 100))
      : input.korting_bedrag_ingevoerd;

  if (round2(korting) > round2(honorarium)) {
    return { error: "Korting mag niet hoger zijn dan het honorarium.", success: false };
  }

  const afwijkend = input.prijstype === "uren" && tariefWijktAf(voorgesteldTarief, input.tarief);

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
      prijstype: input.prijstype,
      tarief: input.tarief,
      tarief_afwijkend: afwijkend,
      honorarium,
      externe_kosten: input.externe_kosten,
      korting,
      korting_type: input.korting_type,
      korting_percentage: input.korting_type === "percentage" ? input.korting_percentage : null,
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

export async function deleteFactuurItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("factuuritems").delete({ count: "exact" }).eq("id", id);

  if (error) {
    return { error: mapDbError(error) };
  }
  if (!count) {
    return { error: "Dit factuuritem kan niet meer worden verwijderd (al definitief/gefactureerd)." };
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  return { error: null };
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
