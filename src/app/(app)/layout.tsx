import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createClient } from "@/lib/supabase/server";
import { IMPERSONATIE_COOKIE } from "@/lib/impersonatie";
import type { UserRole } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data: profileRoles }, { data: laatsteRelease }] = await Promise.all([
    supabase.from("profile_roles").select("role").eq("profile_id", profile.id),
    supabase.from("productchangelog").select("versienummer").order("releasedatum", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const toegekendeRollen: UserRole[] = (profileRoles ?? []).map((r) => r.role);
  const impersonatieDoor = (await cookies()).get(IMPERSONATIE_COOKIE)?.value ?? null;

  return (
    <AppShell
      profile={profile}
      toegekendeRollen={toegekendeRollen}
      impersonatieDoor={impersonatieDoor}
      versienummer={laatsteRelease?.versienummer ?? null}
    >
      {children}
    </AppShell>
  );
}
