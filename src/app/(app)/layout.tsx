import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATIE_COOKIE } from "@/lib/impersonatie";
import { sorteerReleasesNieuwsteEerst } from "@/lib/versie";
import type { UserRole } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: profileRoles }, { data: releases }, { data: meldingen }, { data: gesloten }] = await Promise.all([
    supabase.from("profile_roles").select("role").eq("profile_id", profile.id),
    supabase.from("productchangelog").select("versienummer, releasedatum"),
    supabase.from("meldingen").select("id, soort, tekst, wegklikbaar").eq("actief", true),
    supabase.from("melding_gesloten").select("melding_id").eq("profile_id", profile.id),
  ]);
  // Een weggeklikte melding blijft weg, tenzij hij niet wegklikbaar is (bv. later aangepast).
  const geslotenIds = new Set((gesloten ?? []).map((g) => g.melding_id));
  const zichtbareMeldingen = (meldingen ?? []).filter((m) => !m.wegklikbaar || !geslotenIds.has(m.id));
  const toegekendeRollen: UserRole[] = (profileRoles ?? []).map((r) => r.role);
  const impersonatieDoor = (await cookies()).get(IMPERSONATIE_COOKIE)?.value ?? null;

  return (
    <AppShell
      profile={profile}
      toegekendeRollen={toegekendeRollen}
      impersonatieDoor={impersonatieDoor}
      meldingen={zichtbareMeldingen}
      versienummer={sorteerReleasesNieuwsteEerst(releases ?? [])[0]?.versienummer ?? null}
    >
      {children}
    </AppShell>
  );
}
