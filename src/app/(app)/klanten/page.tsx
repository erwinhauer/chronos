import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { regelbedrag } from "@/lib/factuurbedragen";
import { KlantenTabel, type KlantOmzetRij } from "@/components/klanten-tabel";
import type { UserRole } from "@/lib/supabase/types";

const TOEGESTANE_ROLLEN: UserRole[] = ["teamleider", "finance", "beheerder", "directie"];

export default async function KlantenPage() {
  const profile = await getCurrentProfile();
  if (!profile || !TOEGESTANE_ROLLEN.includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: items }, { data: batches }] = await Promise.all([
    supabase
      .from("factuuritems")
      .select("klant_id, honorarium, externe_kosten, korting, klanten(naam, valuta)")
      .eq("status", "definitief"),
    supabase.from("facturatiebatches").select("id, klant_id"),
  ]);

  const perKlant = new Map<string, KlantOmzetRij>();
  for (const item of items ?? []) {
    const klant = item.klanten as unknown as { naam: string; valuta: string } | null;
    const bestaand = perKlant.get(item.klant_id) ?? {
      klantId: item.klant_id,
      naam: klant?.naam ?? "Onbekend",
      valuta: klant?.valuta ?? "EUR",
      gefactureerd: 0,
      aantalItems: 0,
      aantalSpecificaties: 0,
    };
    bestaand.gefactureerd += regelbedrag(item);
    bestaand.aantalItems += 1;
    perKlant.set(item.klant_id, bestaand);
  }
  for (const b of batches ?? []) {
    const bestaand = perKlant.get(b.klant_id);
    if (bestaand) bestaand.aantalSpecificaties += 1;
  }
  const klanten = Array.from(perKlant.values());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Klanten</h2>
        <p className="text-sm text-muted-foreground">Gefactureerde omzet per klant, over alle tijd.</p>
      </div>
      <KlantenTabel klanten={klanten} />
    </div>
  );
}
