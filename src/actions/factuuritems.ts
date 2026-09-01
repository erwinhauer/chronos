"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
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
  const medewerker_id = String(formData.get("medewerker_id") ?? "").trim();
  const project_id = String(formData.get("project_id") ?? "").trim() || null;
  const team_id = String(formData.get("team_id") ?? "").trim() || null;
  // Op index zippen vóórdat er gededupliceerd wordt — twee onafhankelijke
  // transformaties op dossiernummers/dossiernamen zouden de 1-op-1-koppeling
  // tussen een dossier en zijn naam kunnen verliezen.
  const dossiernummersRuw = formData.getAll("dossiernummers").map((v) => String(v).trim().toUpperCase());
  const dossiernamenRuw = formData.getAll("dossiernamen").map((v) => String(v).trim());
  const gezienDossiernummers = new Set<string>();
  const dossierParen: { dossiernummer: string; dossiernaam: string }[] = [];
  for (const [i, dossiernummer] of dossiernummersRuw.entries()) {
    if (!dossiernummer || gezienDossiernummers.has(dossiernummer)) continue;
    gezienDossiernummers.add(dossiernummer);
    dossierParen.push({ dossiernummer, dossiernaam: dossiernamenRuw[i] ?? "" });
  }
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
    medewerker_id,
    project_id,
    team_id,
    dossierParen,
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
// parseDossiernummer(). De dossiernaam (het merk) vult de gebruiker nu zelf
// in per dossier; zodra de Patricia-koppeling er is kan dit automatisch op
// basis van het dossiernummer.
function resolveDossiers(dossierParen: { dossiernummer: string; dossiernaam: string }[]): DossierResolutie {
  if (dossierParen.length === 0) {
    return { ok: false, error: "Voeg minimaal één dossier toe." };
  }

  const rijen: { dossiernummer: string; type_dienst: string; land: string; matter_naam: string | null; volgorde: number }[] =
    [];
  for (const [index, { dossiernummer, dossiernaam }] of dossierParen.entries()) {
    const parsed = parseDossiernummer(dossiernummer);
    if (!parsed) {
      return { ok: false, error: `Dossiernummer "${dossiernummer}" heeft niet het verwachte formaat.` };
    }
    if (!dossiernaam) {
      return { ok: false, error: `Vul de dossiernaam in voor dossier "${dossiernummer}".` };
    }
    rijen.push({
      dossiernummer,
      type_dienst: parsed.typeLabel,
      land: parsed.landIso,
      matter_naam: dossiernaam,
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

async function medewerkerBestaat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  medewerker_id: string
): Promise<boolean> {
  if (!medewerker_id) return false;
  const { data } = await supabase.from("profiles").select("id").eq("id", medewerker_id).eq("actief", true).single();
  return Boolean(data);
}

async function klantNaam(supabase: Awaited<ReturnType<typeof createClient>>, klant_id: string): Promise<string> {
  if (!klant_id) return "—";
  const { data } = await supabase.from("klanten").select("naam").eq("id", klant_id).single();
  return data?.naam ?? "Onbekend";
}

async function projectNaam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  project_id: string | null
): Promise<string> {
  if (!project_id) return "Geen project";
  const { data } = await supabase.from("projecten").select("naam").eq("id", project_id).single();
  return data?.naam ?? "Onbekend";
}

async function medewerkerNaam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  medewerker_id: string
): Promise<string> {
  if (!medewerker_id) return "—";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", medewerker_id).single();
  return data?.full_name ?? "Onbekend";
}

async function teamNaam(supabase: Awaited<ReturnType<typeof createClient>>, team_id: string | null): Promise<string> {
  if (!team_id) return "Geen team";
  const { data } = await supabase.from("teams").select("naam").eq("id", team_id).single();
  return data?.naam ?? "Onbekend";
}

// Nooit vertrouwen op de client welk team gekozen is — de RLS-policy bewaakt
// dit ook al bij het opslaan, maar een expliciete check hier levert een
// nette foutmelding i.p.v. een kale database-fout.
async function teamIdGeldigVoorMedewerker(
  supabase: Awaited<ReturnType<typeof createClient>>,
  team_id: string | null,
  medewerker_id: string
): Promise<boolean> {
  if (!team_id) return true;
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", team_id)
    .eq("profile_id", medewerker_id)
    .maybeSingle();
  return Boolean(data);
}

type VeldWijziging = { veld: string; oud: string | null; nieuw: string | null };

function vergelijkVeld(wijzigingen: VeldWijziging[], veld: string, oud: unknown, nieuw: unknown) {
  const oudStr = oud === null || oud === undefined ? null : String(oud);
  const nieuwStr = nieuw === null || nieuw === undefined ? null : String(nieuw);
  if (oudStr !== nieuwStr) wijzigingen.push({ veld, oud: oudStr, nieuw: nieuwStr });
}

// Logt op veldniveau wie wat heeft gewijzigd (zie "Log" op het bewerkscherm).
// Faalt bewust stil door — een logfout mag een geslaagde opslag niet blokkeren.
async function logWijzigingen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  factuuritemId: string,
  gebruikerId: string,
  wijzigingen: VeldWijziging[]
) {
  if (wijzigingen.length === 0) return;
  try {
    await supabase.from("factuuritem_wijzigingen").insert(
      wijzigingen.map((w) => ({
        factuuritem_id: factuuritemId,
        gewijzigd_door: gebruikerId,
        veld: w.veld,
        oude_waarde: w.oud,
        nieuwe_waarde: w.nieuw,
      }))
    );
    // Lazy opruiming van verlopen logregels (systeembreed, niet per item) —
    // lift mee op elke bewerking, geen losse cron nodig. De RLS-policy staat
    // alleen verwijderen van rijen ouder dan 6 maanden toe, dus dit filter
    // ("ouder dan nu") is puur om PostgREST een where-clause te geven.
    await supabase.from("factuuritem_wijzigingen").delete().lt("aangemaakt_op", new Date().toISOString());
  } catch {
    // best-effort, zie comment hierboven
  }
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
  const dossiers = resolveDossiers(input.dossierParen);
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

  if (!(await teamIdGeldigVoorMedewerker(supabase, input.team_id, user.id))) {
    return { error: "Ongeldig team gekozen.", success: false };
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
      team_id: input.team_id,
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
  redirect(`/factuuritems/klant/${input.klant_id}`);
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
  const dossiers = resolveDossiers(input.dossierParen);
  if (!dossiers.ok) {
    return { error: dossiers.error, success: false };
  }
  if (!(await klantBestaat(supabase, input.klant_id))) {
    return { error: "De gekozen klant bestaat niet (meer).", success: false };
  }

  const [
    {
      data: { user },
    },
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentProfile()]);
  if (!user) {
    return { error: "Je sessie is verlopen. Log opnieuw in.", success: false };
  }

  // Momentopname vóór de update, voor de wijzigingenlog.
  const { data: voor } = await supabase
    .from("factuuritems")
    .select(
      "klant_id, project_id, team_id, medewerker_id, datum, omschrijving_klant, interne_opmerking, qty, prijstype, tarief, externe_kosten, korting, kantoorkosten_van_toepassing, declarabel, klanten(naam), projecten(naam), profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, matter_naam)"
    )
    .eq("id", id)
    .single();

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

  // Alleen teamleider/beheerder mogen wie het item heeft aangemaakt wijzigen —
  // nooit de client vertrouwen, dus de rol hier opnieuw (server-side) checken.
  // Bij elke andere rol blijft medewerker_id gewoon ongewijzigd.
  const magMedewerkerWijzigen = profile?.role === "teamleider" || profile?.role === "beheerder";
  let medewerkerUpdate: { medewerker_id?: string } = {};
  if (magMedewerkerWijzigen && input.medewerker_id) {
    if (!(await medewerkerBestaat(supabase, input.medewerker_id))) {
      return { error: "De gekozen medewerker bestaat niet (meer).", success: false };
    }
    medewerkerUpdate = { medewerker_id: input.medewerker_id };
  }

  const effectieveMedewerkerId = medewerkerUpdate.medewerker_id ?? voor?.medewerker_id ?? user.id;
  if (!(await teamIdGeldigVoorMedewerker(supabase, input.team_id, effectieveMedewerkerId))) {
    return { error: "Ongeldig team gekozen.", success: false };
  }

  const { error } = await supabase
    .from("factuuritems")
    .update({
      klant_id: input.klant_id,
      project_id: input.project_id,
      team_id: input.team_id,
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
      ...medewerkerUpdate,
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

  if (voor) {
    const oudeKlantNaam = (voor.klanten as unknown as { naam: string } | null)?.naam ?? "Onbekend";
    const oudeProjectNaam = (voor.projecten as unknown as { naam: string } | null)?.naam ?? "Geen project";
    const oudeMedewerkerNaam = (voor.profiles as unknown as { full_name: string } | null)?.full_name ?? "Onbekend";
    const nieuweMedewerkerId = medewerkerUpdate.medewerker_id ?? voor.medewerker_id;

    const oudeTeamNaam = await teamNaam(supabase, voor.team_id);

    const [nieuweKlantNaamVal, nieuweProjectNaamVal, nieuweMedewerkerNaamVal, nieuweTeamNaamVal] = await Promise.all([
      voor.klant_id === input.klant_id ? Promise.resolve(oudeKlantNaam) : klantNaam(supabase, input.klant_id),
      voor.project_id === input.project_id
        ? Promise.resolve(oudeProjectNaam)
        : projectNaam(supabase, input.project_id),
      nieuweMedewerkerId === voor.medewerker_id
        ? Promise.resolve(oudeMedewerkerNaam)
        : medewerkerNaam(supabase, nieuweMedewerkerId),
      voor.team_id === input.team_id ? Promise.resolve(oudeTeamNaam) : teamNaam(supabase, input.team_id),
    ]);

    const oudeDossiers = (voor.factuuritem_dossiers ?? [])
      .map((d) => d.dossiernummer)
      .sort()
      .join(", ");
    const nieuweDossiers = dossiers.rijen
      .map((d) => d.dossiernummer)
      .sort()
      .join(", ");
    const oudeDossiernamen = (voor.factuuritem_dossiers ?? [])
      .map((d) => d.matter_naam ?? "—")
      .sort()
      .join(", ");
    const nieuweDossiernamen = dossiers.rijen
      .map((d) => d.matter_naam ?? "—")
      .sort()
      .join(", ");

    const wijzigingen: VeldWijziging[] = [];
    vergelijkVeld(wijzigingen, "Klant", oudeKlantNaam, nieuweKlantNaamVal);
    vergelijkVeld(wijzigingen, "Project", oudeProjectNaam, nieuweProjectNaamVal);
    vergelijkVeld(wijzigingen, "Medewerker", oudeMedewerkerNaam, nieuweMedewerkerNaamVal);
    vergelijkVeld(wijzigingen, "Team", oudeTeamNaam, nieuweTeamNaamVal);
    vergelijkVeld(wijzigingen, "Dossier(s)", oudeDossiers, nieuweDossiers);
    vergelijkVeld(wijzigingen, "Dossiernaam", oudeDossiernamen, nieuweDossiernamen);
    vergelijkVeld(wijzigingen, "Datum", voor.datum, input.datum);
    vergelijkVeld(wijzigingen, "Omschrijving voor klant", voor.omschrijving_klant, input.omschrijving_klant);
    vergelijkVeld(wijzigingen, "Interne opmerking", voor.interne_opmerking, input.interne_opmerking);
    vergelijkVeld(wijzigingen, "Aantal (Qty)", voor.qty, input.qty);
    vergelijkVeld(wijzigingen, "Prijstype", voor.prijstype, input.prijstype);
    vergelijkVeld(wijzigingen, "Prijs per uur / vast honorarium", voor.tarief, input.tarief);
    vergelijkVeld(wijzigingen, "Kosten van derden", voor.externe_kosten, input.externe_kosten);
    vergelijkVeld(wijzigingen, "Korting", voor.korting, korting);
    vergelijkVeld(
      wijzigingen,
      "Kantoorkosten van toepassing",
      voor.kantoorkosten_van_toepassing,
      input.kantoorkosten_van_toepassing
    );
    vergelijkVeld(wijzigingen, "Declarabel", voor.declarabel, input.declarabel);

    await logWijzigingen(supabase, id, user.id, wijzigingen);
  }

  revalidatePath("/factuuritems");
  revalidatePath("/dashboard");
  redirect(`/factuuritems/klant/${input.klant_id}`);
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
