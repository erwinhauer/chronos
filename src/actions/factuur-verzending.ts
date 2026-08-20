"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { genereerFactuurPdf } from "@/lib/factuur-pdf";
import { haalLandenMap } from "@/lib/landen";

export type VerstuurFactuurResultaat = { success: boolean; error: string | null };

// Genereert de PDF, bewaart hem in Storage, en verstuurt hem naar de debiteur
// (+ cc + een kopie aan de medewerkers die op deze factuur staan). Faalt nooit
// naar de aanroeper toe met een throw — omzet is al geboekt bij het aanmaken
// van de batch (fase 3-besluit) en dat mag een mislukte verzending niet
// terugdraaien; in plaats daarvan komt de fout op de batch te staan, zichtbaar
// op de specificatiepagina, met een "opnieuw versturen"-knop.
export async function verstuurFactuur(batchId: string): Promise<VerstuurFactuurResultaat> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "finance" && profile?.role !== "beheerder") {
    return { success: false, error: "Alleen finance en beheerder kunnen facturen (opnieuw) versturen." };
  }

  const supabase = await createClient();

  try {
    const { data: batch } = await supabase
      .from("facturatiebatches")
      .select("*, klanten(*), projecten(naam, po_nummer)")
      .eq("id", batchId)
      .single();
    if (!batch) throw new Error("Factuur niet gevonden.");
    const klant = batch.klanten;
    if (!klant) throw new Error("Klant niet gevonden.");
    if (klant.verzending_toegestaan && !batch.verzend_email) {
      throw new Error("Geen e-mailadres bekend voor deze factuur.");
    }
    const project = batch.projecten as unknown as { naam: string; po_nummer: string | null } | null;

    const { data: items } = await supabase
      .from("factuuritems")
      .select(
        "id, datum, omschrijving_klant, eenheidstype, qty, tarief, honorarium, externe_kosten, korting, medewerker_id, profiles!factuuritems_medewerker_id_fkey(full_name), factuuritem_dossiers(dossiernummer, type_dienst, land, volgorde)"
      )
      .eq("facturatiebatch_id", batch.id)
      .order("datum", { ascending: true });

    const medewerkerIds = Array.from(new Set((items ?? []).map((i) => i.medewerker_id)));
    const [{ data: medewerkers }, { data: teamMembers }] = await Promise.all([
      supabase.from("profiles").select("email").in("id", medewerkerIds),
      supabase.from("team_members").select("team_id").in("profile_id", medewerkerIds),
    ]);
    const teamIds = Array.from(new Set((teamMembers ?? []).map((t) => t.team_id)));
    const { data: teams } =
      teamIds.length > 0 ? await supabase.from("teams").select("email").in("id", teamIds) : { data: [] };
    const isNietLeeg = (v: string | null): v is string => Boolean(v);
    const teamEmails = [
      ...(medewerkers ?? []).map((m) => m.email).filter(isNietLeeg),
      ...(teams ?? []).map((t) => t.email).filter(isNietLeeg),
    ];

    const landen = await haalLandenMap(supabase);

    const pdfBuffer = await genereerFactuurPdf({
      klant,
      project,
      valuta: batch.valuta,
      factuurnummer: batch.accountview_factuurnummer,
      periodeStart: batch.periode_start,
      periodeEind: batch.periode_eind,
      landen,
      items: (items ?? []).map((item) => ({
        id: item.id,
        datum: item.datum,
        omschrijving_klant: item.omschrijving_klant,
        eenheidstype: item.eenheidstype,
        qty: item.qty,
        tarief: item.tarief,
        honorarium: item.honorarium,
        externe_kosten: item.externe_kosten,
        korting: item.korting,
        medewerkerNaam: (item.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
        dossiers: item.factuuritem_dossiers ?? [],
      })),
      totalen: {
        totaal_honorarium: batch.totaal_honorarium,
        totaal_externe_kosten: batch.totaal_externe_kosten,
        totaal_korting: batch.totaal_korting,
        totaal_kantoorkosten: batch.totaal_kantoorkosten,
        extra_korting: batch.extra_korting,
        totaal_bedrag: batch.totaal_bedrag,
      },
    });

    const pdfStoragePath = `${klant.id}/${batch.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("facturen")
      .upload(pdfStoragePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Opslaan van de PDF is mislukt: ${uploadError.message}`);

    if (!klant.verzending_toegestaan) {
      // Klant werkt met een eigen billing-systeem: alleen de PDF aanmaken/opslaan,
      // niet versturen. Geen fout — verzonden_op blijft bewust null.
      await supabase
        .from("facturatiebatches")
        .update({ pdf_storage_path: pdfStoragePath, verzend_fout: null })
        .eq("id", batchId);
      revalidatePath(`/facturatiebatches/${batchId}`);
      return { success: true, error: null };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      await supabase
        .from("facturatiebatches")
        .update({ pdf_storage_path: pdfStoragePath, verzend_fout: "RESEND_API_KEY ontbreekt in de omgeving." })
        .eq("id", batchId);
      revalidatePath(`/facturatiebatches/${batchId}`);
      return { success: false, error: "RESEND_API_KEY ontbreekt — de PDF is aangemaakt maar niet verstuurd." };
    }

    if (!batch.verzend_email) throw new Error("Geen e-mailadres bekend voor deze factuur.");

    const resend = new Resend(resendApiKey);
    const cc = [...(batch.verzend_cc ?? []).filter(isNietLeeg), ...teamEmails];
    const { error: sendError } = await resend.emails.send({
      from: process.env.FACTUUR_AFZENDER ?? "Chronos <facturatie@knijff.com>",
      to: batch.verzend_email,
      cc: cc.length > 0 ? cc : undefined,
      subject: `Factuur ${klant.naam} — ${batch.periode_start} t/m ${batch.periode_eind}`,
      text:
        klant.specificatietaal === "en"
          ? "Please find the fee note attached."
          : "Bijgaand ontvangt u de factuur.",
      attachments: [{ filename: "factuur.pdf", content: pdfBuffer }],
    });
    if (sendError) throw new Error(sendError.message);

    // TODO fase-backlog: kopie van de PDF in elk genoemd dossier hangen zodra de
    // echte Patricia-koppeling er is (nu een dummy-tabel, zie routekaart).

    await supabase
      .from("facturatiebatches")
      .update({ pdf_storage_path: pdfStoragePath, verzonden_op: new Date().toISOString(), verzend_fout: null })
      .eq("id", batchId);

    revalidatePath(`/facturatiebatches/${batchId}`);
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij versturen.";
    await supabase.from("facturatiebatches").update({ verzend_fout: message }).eq("id", batchId);
    revalidatePath(`/facturatiebatches/${batchId}`);
    return { success: false, error: message };
  }
}
