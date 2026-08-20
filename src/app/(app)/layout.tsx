import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profileRoles } = await supabase.from("profile_roles").select("role").eq("profile_id", profile.id);
  const toegekendeRollen: UserRole[] = (profileRoles ?? []).map((r) => r.role);

  return (
    <AppShell profile={profile} toegekendeRollen={toegekendeRollen}>
      {children}
    </AppShell>
  );
}
