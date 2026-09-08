import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Bevestigt een magiclink/OTP-token via token_hash — nodig naast /auth/callback
// (dat alleen de PKCE-`code`-flow afhandelt) omdat een via de Admin-API
// gegenereerde link (bv. "inloggen als", of een handmatig verstuurde inloglink)
// geen code_verifier-cookie heeft en dus impliciet met een fragment-token
// terugkomt — onzichtbaar voor een server-side route handler. verifyOtp met
// token_hash werkt server-side, ongeacht implicit- of PKCE-flow.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?fout=verlopen", url.origin));
}
