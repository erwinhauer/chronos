"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import type { UserRole } from "@/lib/supabase/types";

async function assertBeheerder() {
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
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "medewerker") as UserRole;
  const teamIds = formData.getAll("team_ids").map(String);

  if (!email || !full_name) {
    return { error: "Naam en e-mailadres zijn verplicht.", success: false };
  }

  const tempWachtwoord = genereerTijdelijkWachtwoord();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempWachtwoord,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error || !data.user) {
    return {
      error: error?.message?.includes("already been registered")
        ? "Er bestaat al een gebruiker met dit e-mailadres."
        : "Aanmaken van de gebruiker is mislukt.",
      success: false,
    };
  }

  if (teamIds.length > 0) {
    const supabase = await createClient();
    await supabase.from("team_members").insert(teamIds.map((team_id) => ({ team_id, profile_id: data.user.id })));
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

  const role = String(formData.get("role") ?? "") as UserRole;
  const actief = formData.get("actief") === "on";
  const teamIds = formData.getAll("team_ids").map(String);

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role, actief }).eq("id", profileId);
  if (error) {
    return { error: "Bijwerken van de gebruiker is mislukt.", success: false };
  }

  const { error: deleteError } = await supabase.from("team_members").delete().eq("profile_id", profileId);
  if (deleteError) {
    return { error: "Bijwerken van teams is mislukt.", success: false };
  }
  if (teamIds.length > 0) {
    const { error: insertError } = await supabase
      .from("team_members")
      .insert(teamIds.map((team_id) => ({ team_id, profile_id: profileId })));
    if (insertError) {
      return { error: "Bijwerken van teams is mislukt.", success: false };
    }
  }

  revalidatePath("/instellingen");
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
