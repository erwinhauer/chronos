import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createClient } from "@/lib/supabase/server";
import { huidigeSessieId } from "@/lib/supabase/sessie";
import { IMPERSONATIE_COOKIE } from "@/lib/impersonatie";
import { sorteerReleasesNieuwsteEerst } from "@/lib/versie";
import type { UserRole } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const sessieId = await huidigeSessieId(supabase);
  const [{ data: profileRoles }, { data: releases }, { data: meldingen }, { data: gezien }] = await Promise.all([
    supabase.from("profile_roles").select("role").eq("profile_id", profile.id),
    supabase.from("productchangelog").select("versienummer, releasedatum"),
    supabase
      .from("meldingen")
      .select("id, soort, tekst, wegklikbaar, verloopt_op")
      .eq("actief", true)
      .or(`verloopt_op.is.null,verloopt_op.gt.${new Date().toISOString()}`),
    sessieId
      ? supabase.from("melding_gezien").select("melding_id").eq("profile_id", profile.id).eq("sessie_id", sessieId)
      : Promise.resolve({ data: [] as { melding_id: string }[] }),
  ]);
  // Een wegklikbare melding verschijnt één keer per inlogsessie; een niet-wegklikbare blijft staan.
  // Zonder bekende sessie tonen we alles (liever te veel dan een melding missen).
  const gezienIds = new Set((gezien ?? []).map((g) => g.melding_id));
  const actieveMeldingen = meldingen ?? [];
  const teTonenMeldingen = actieveMeldingen.filter((m) => !m.wegklikbaar || !gezienIds.has(m.id));
  const toegekendeRollen: UserRole[] = (profileRoles ?? []).map((r) => r.role);
  const impersonatieDoor = (await cookies()).get(IMPERSONATIE_COOKIE)?.value ?? null;

  return (
    <AppShell
      profile={profile}
      toegekendeRollen={toegekendeRollen}
      impersonatieDoor={impersonatieDoor}
      meldingen={teTonenMeldingen}
      actieveMeldingIds={actieveMeldingen.map((m) => m.id)}
      versienummer={sorteerReleasesNieuwsteEerst(releases ?? [])[0]?.versienummer ?? null}
    >
      {children}
    </AppShell>
  );
}
