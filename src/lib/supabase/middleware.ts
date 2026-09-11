import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm"];
const WACHTWOORD_WIJZIGEN_PATH = "/wachtwoord-wijzigen";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Verplichte wachtwoordwijziging (o.a. na het gedeelde standaardwachtwoord
    // bij de overstap van magic-link naar wachtwoord-login) — geldt voor elk
    // pad behalve de wijzig-pagina zelf, zodat je daar niet weer weg wordt
    // gestuurd voordat je een eigen wachtwoord hebt gekozen.
    const moetWachtwoordWijzigen = user.user_metadata?.must_change_password === true;
    if (moetWachtwoordWijzigen && request.nextUrl.pathname !== WACHTWOORD_WIJZIGEN_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = WACHTWOORD_WIJZIGEN_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
