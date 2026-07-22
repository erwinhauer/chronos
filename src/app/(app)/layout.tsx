import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/supabase/current-profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
