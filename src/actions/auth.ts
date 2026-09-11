"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATIE_COOKIE } from "@/lib/impersonatie";

export type MagicLinkState = { error: string | null; success: boolean };
export type WachtwoordLoginState = { error: string | null };

// Tijdelijk de primaire inlogmethode (i.p.v. magic link) i.v.m. de limiet op
// het aantal mails dat Supabase kan versturen tijdens de teamtest. Zie
// stuurMagicLink hieronder — die blijft intact voor als we hier later op
// terugkomen (evt. i.c.m. 2FA, zie backlog).
export async function logInMetWachtwoord(
  _prevState: WachtwoordLoginState,
  formData: FormData
): Promise<WachtwoordLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !wachtwoord) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });

  if (error) {
    return { error: "E-mailadres of wachtwoord is onjuist." };
  }

  redirect(next);
}

export async function stuurMagicLink(
  _prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email) {
    return { error: "Vul je e-mailadres in.", success: false };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${next}`,
    },
  });

  if (error?.status === 429) {
    return { error: "Je hebt net al een link aangevraagd. Wacht even en probeer het dan opnieuw.", success: false };
  }

  // Altijd succes tonen, ongeacht of het e-mailadres bestaat — anders kan deze pagina
  // gebruikt worden om te achterhalen welke e-mailadressen geregistreerd zijn. Met
  // shouldCreateUser: false geeft Supabase voor een onbekend e-mailadres altijd een
  // foutmelding terug, die we hier bewust negeren.
  return { error: null, success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(IMPERSONATIE_COOKIE);
  redirect("/login");
}
