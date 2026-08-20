"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import type { UserRole } from "@/lib/supabase/types";

export async function assertBeheerder() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "beheerder") {
    throw new Error("Alleen beheerders kunnen dit beheren.");
  }
  return profile;
}

function genereerTijdelijkWachtwoord() {
  return `Chronos-${crypto.randomBytes(9).toString("base64url")}`;
}

function lijstVanTekst(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
}

// ============================================================================
// Teams
// ============================================================================

export type TeamFormState = { error: string | null; success: boolean };

export async function createTeam(_prevState: TeamFormState, formData: FormData): Promise<TeamFormState> {
  await assertBeheerder();
  const naam = String(formData.get("naam") ?? "").trim();
  if (!naam) {
    return { error: "Teamnaam is verplicht.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ naam });
  if (error) {
    return {
      error: error.code === "23505" ? "Er bestaat al een team met deze naam." : "Aanmaken van team is mislukt.",
      success: false,
    };
  }

  revalidatePath("/instellingen");
  return { error: null, success: true };
}

export async function setTeamLeden(teamId: string, profileIds: string[]) {
  await assertBeheerder();
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("team_members").delete().eq("team_id", teamId);
  if (deleteError) throw new Error("Bijwerken van teamleden is mislukt.");

  if (profileIds.length > 0) {
    const { error: insertError } = await supabase
      .from("team_members")
      .insert(profileIds.map((profile_id) => ({ team_id: teamId, profile_id })));
    if (insertError) throw new Error("Bijwerken van teamleden is mislukt.");
  }

  revalidatePath("/instellingen");
}

// ============================================================================
// Gebruikers
// ============================================================================

export type GebruikerFormState = {
  error: string | null;
  success: boolean;
  tempWachtwoord?: string;
  email?: string;
};

export async function createGebruiker(
  _prevState: GebruikerFormState,
  formData: FormData
): Promise<GebruikerFormState> {
  await assertBeheerder();

  const email = String(formData.get("email") ?? "").trim();
  const voornaam = String(formData.get("voornaam") ?? "").trim();
  const achternaam = String(formData.get("achternaam") ?? "").trim();
  const roles = formData.getAll("role_ids").map(String) as UserRole[];
  const teamIds = formData.getAll("team_ids").map(String);
  const initialen = String(formData.get("initialen") ?? "").trim().toUpperCase().slice(0, 3);

  if (!email || !voornaam || roles.length === 0) {
    return { error: "Voornaam, e-mailadres en minimaal één rol zijn verplicht.", success: false };
  }

  const actieveRol = roles[0];
  const tempWachtwoord = genereerTijdelijkWachtwoord();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempWachtwoord,
    email_confirm: true,
    user_metadata: { voornaam, achternaam, role: actieveRol },
  });

  if (error || !data.user) {
    return {
      error: error?.message?.includes("already been registered")
        ? "Er bestaat al een gebruiker met dit e-mailadres."
        : "Aanmaken van de gebruiker is mislukt.",
      success: false,
    };
  }

  // handle_new_user() zet de eerste rol al in profile_roles; de rest hier aanvullen.
  await admin
    .from("profile_roles")
    .upsert(
      roles.map((role) => ({ profile_id: data.user.id, role })),
      { onConflict: "profile_id,role" }
    );

  if (initialen) {
    await admin.from("profiles").update({ initialen }).eq("id", data.user.id);
  }
  if (teamIds.length > 0) {
    await admin.from("team_members").insert(teamIds.map((team_id) => ({ team_id, profile_id: data.user.id })));
  }

  revalidatePath("/instellingen");
  return { error: null, success: true, tempWachtwoord, email };
}

export type UpdateGebruikerFormState = { error: string | null; success: boolean };

export async function updateGebruiker(
  profileId: string,
  _prevState: UpdateGebruikerFormState,
  formData: FormData
): Promise<UpdateGebruikerFormState> {
  await assertBeheerder();

  const voornaam = String(formData.get("voornaam") ?? "").trim();
  const achternaam = String(formData.get("achternaam") ?? "").trim();
  const roles = formData.getAll("role_ids").map(String) as UserRole[];
  const actief = formData.get("actief") === "on";
  const teamIds = formData.getAll("team_ids").map(String);
  const initialen = String(formData.get("initialen") ?? "").trim().toUpperCase().slice(0, 3);

  if (!voornaam || roles.length === 0) {
    return { error: "Voornaam en minimaal één rol zijn verplicht.", success: false };
  }

  // Service-role: admin-bewerkingen lopen hiermee altijd door, los van de
  // zelfbedienings-trigger die gewone gebruikers hun eigen rij/rol laat aanpassen.
  const admin = createAdminClient();

  const { data: huidig } = await admin.from("profiles").select("role").eq("id", profileId).single();
  const actieveRol = huidig && roles.includes(huidig.role) ? huidig.role : roles[0];

  const { error } = await admin
    .from("profiles")
    .update({ voornaam, achternaam, role: actieveRol, actief, initialen: initialen || null })
    .eq("id", profileId);
  if (error) {
    return { error: "Bijwerken van de gebruiker is mislukt.", success: false };
  }

  const { error: rolDeleteError } = await admin.from("profile_roles").delete().eq("profile_id", profileId);
  if (rolDeleteError) {
    return { error: "Bijwerken van rollen is mislukt.", success: false };
  }
  const { error: rolInsertError } = await admin
    .from("profile_roles")
    .insert(roles.map((role) => ({ profile_id: profileId, role })));
  if (rolInsertError) {
    return { error: "Bijwerken van rollen is mislukt.", success: false };
  }

  const { error: deleteError } = await admin.from("team_members").delete().eq("profile_id", profileId);
  if (deleteError) {
    return { error: "Bijwerken van teams is mislukt.", success: false };
  }
  if (teamIds.length > 0) {
    const { error: insertError } = await admin
      .from("team_members")
      .insert(teamIds.map((team_id) => ({ team_id, profile_id: profileId })));
    if (insertError) {
      return { error: "Bijwerken van teams is mislukt.", success: false };
    }
  }

  revalidatePath("/instellingen");
  revalidatePath("/profiel");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

// ============================================================================
// Changelog
// ============================================================================

export type ChangelogFormState = { error: string | null; success: boolean };

const SEMVER = /^\d+\.\d+\.\d+$/;

export async function createChangelogEntry(
  _prevState: ChangelogFormState,
  formData: FormData
): Promise<ChangelogFormState> {
  await assertBeheerder();

  const versienummer = String(formData.get("versienummer") ?? "").trim();
  const releasedatum = String(formData.get("releasedatum") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const gebruikersactie = String(formData.get("gebruikersactie") ?? "").trim();

  if (!versienummer || !releasedatum || !titel) {
    return { error: "Versienummer, releasedatum en titel zijn verplicht.", success: false };
  }
  if (!SEMVER.test(versienummer)) {
    return { error: "Versienummer moet de vorm MAJOR.MINOR.PATCH hebben, bv. 1.2.0.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("productchangelog").insert({
    versienummer,
    releasedatum,
    titel,
    nieuwe_functies: lijstVanTekst(formData.get("nieuwe_functies")),
    wijzigingen: lijstVanTekst(formData.get("wijzigingen")),
    bugfixes: lijstVanTekst(formData.get("bugfixes")),
    bekende_beperkingen: lijstVanTekst(formData.get("bekende_beperkingen")),
    gebruikersactie: gebruikersactie || null,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Dit versienummer bestaat al." : "Aanmaken van de changelog-entry is mislukt.",
      success: false,
    };
  }

  revalidatePath("/instellingen");
  return { error: null, success: true };
}
