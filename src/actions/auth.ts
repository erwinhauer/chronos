"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATIE_COOKIE } from "@/lib/impersonatie";

export type LoginState = { error: string | null };

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Vul e-mailadres en wachtwoord in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mailadres of wachtwoord onjuist." };
  }

  (await cookies()).delete(IMPERSONATIE_COOKIE);
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(IMPERSONATIE_COOKIE);
  redirect("/login");
}

export type ForgotPasswordState = { error: string | null; success: boolean };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Vul je e-mailadres in.", success: false };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/wachtwoord-resetten`,
  });

  // Altijd succes tonen, ongeacht of het e-mailadres bestaat — anders kan deze pagina
  // gebruikt worden om te achterhalen welke e-mailadressen geregistreerd zijn.
  return { error: null, success: true };
}

export type UpdatePasswordState = { error: string | null };

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Wachtwoord moet minimaal 8 tekens zijn." };
  }
  if (password !== confirm) {
    return { error: "Wachtwoorden komen niet overeen." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Wachtwoord instellen is mislukt. Vraag een nieuwe link aan via 'Wachtwoord vergeten'." };
  }

  redirect("/dashboard");
}
