"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createClient } from "@/lib/supabase/server";
import type { NieuweKlant } from "@/actions/klanten";

type HubspotCompanyProperties = {
  name?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  patriciaid?: string | null;
};
type HubspotCompany = { id: string; properties: HubspotCompanyProperties };

export type HubspotZoekresultaat = {
  hubspotId: string;
  naam: string;
  adres: string | null;
  patriciaId: string | null;
  bestaatAl: boolean;
};
export type HubspotZoekResponse = { resultaten: HubspotZoekresultaat[]; fout: string | null };
export type HubspotImportResponse = { success: boolean; fout: string | null; klant: NieuweKlant | null };

// Adresregels overslaan die leeg zijn — niet elk HubSpot-bedrijf heeft alle velden gevuld.
function bouwAdres(p: HubspotCompanyProperties): string | null {
  const regels: string[] = [];
  if (p.address) regels.push(p.address);
  if (p.address2) regels.push(p.address2);
  const plaatsRegel = [p.zip, p.city].filter(Boolean).join(" ");
  if (plaatsRegel) regels.push(plaatsRegel);
  if (p.country) regels.push(p.country);
  return regels.length > 0 ? regels.join("\n") : null;
}

function magHubspotImporteren(profile: { actief: boolean } | null) {
  return profile?.actief === true;
}

const PROPERTIES = "name,address,address2,city,zip,country,patriciaid";

async function hubspotFetch(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("HubSpot-token is ongeldig of verlopen.");
    throw new Error(`HubSpot gaf een fout terug (status ${response.status}).`);
  }
  return response.json();
}

// Zoekt op naam (max 20 resultaten) — expliciet gekozen boven "alle Companies ophalen":
// een echt HubSpot-portal kan duizenden bedrijven bevatten (leads, prospects, etc.),
// dus wordt hier gericht gezocht i.p.v. alles binnen te halen.
export async function zoekHubspotKlanten(zoekterm: string): Promise<HubspotZoekResponse> {
  const profile = await getCurrentProfile();
  if (!magHubspotImporteren(profile)) {
    return { resultaten: [], fout: "Je account is niet actief." };
  }
  // Normaliseer whitespace (ook non-breaking spaces/tabs, bv. uit een
  // geplakte naam) naar gewone spaties — CONTAINS_TOKEN splitst op whitespace
  // en een niet-herkend spatie-achtig teken zou de tokenisatie stilletjes
  // kunnen verstoren.
  const term = zoekterm.replace(/\s+/g, " ").trim();
  if (!term) {
    return { resultaten: [], fout: null };
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return { resultaten: [], fout: "HUBSPOT_ACCESS_TOKEN ontbreekt in de omgeving." };
  }

  // CONTAINS_TOKEN matcht alleen complete woorden — zonder wildcard levert een
  // nog niet afgetypt woord (bv. "bouwmach" voordat je "bouwmachines" afmaakt)
  // dus geen enkel resultaat op. Elk woord een eigen prefix-wildcard geven
  // (i.p.v. alleen het laatste) maakt de match ook bestand tegen een niet
  // volledig getypt eerder woord en tegen kleine tokenisatie-afwijkingen
  // (bv. leestekens) op een eerder woord.
  const zoekwaarde = term
    .split(" ")
    .map((woord) => `${woord}*`)
    .join(" ");

  let companies: HubspotCompany[];
  try {
    const data = await hubspotFetch(token, "/crm/v3/objects/companies/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "name", operator: "CONTAINS_TOKEN", value: zoekwaarde }] }],
        properties: PROPERTIES.split(","),
        limit: 20,
      }),
    });
    companies = data.results ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Zoeken in HubSpot is mislukt.";
    return { resultaten: [], fout: message };
  }

  const supabase = await createClient();
  const { data: bestaande } = companies.length
    ? await supabase.from("klanten").select("hubspot_id").in(
        "hubspot_id",
        companies.map((c) => c.id)
      )
    : { data: [] };
  const bestaandeIds = new Set((bestaande ?? []).map((k) => k.hubspot_id));

  const resultaten: HubspotZoekresultaat[] = companies
    .filter((c) => c.properties.name?.trim())
    .map((c) => ({
      hubspotId: c.id,
      naam: c.properties.name!.trim(),
      adres: bouwAdres(c.properties),
      patriciaId: c.properties.patriciaid?.trim() || null,
      bestaatAl: bestaandeIds.has(c.id),
    }));

  return { resultaten, fout: null };
}

// Importeert precies één, door de beheerder gekozen bedrijf. Overschrijft nooit een
// al ingevuld Chronos-veld: bij een bestaande klant wordt alleen een leeg adres aangevuld.
export async function importeerHubspotKlant(hubspotId: string): Promise<HubspotImportResponse> {
  const profile = await getCurrentProfile();
  if (!magHubspotImporteren(profile)) {
    return { success: false, fout: "Je account is niet actief.", klant: null };
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return { success: false, fout: "HUBSPOT_ACCESS_TOKEN ontbreekt in de omgeving.", klant: null };
  }

  let company: HubspotCompany;
  try {
    company = await hubspotFetch(
      token,
      `/crm/v3/objects/companies/${encodeURIComponent(hubspotId)}?properties=${PROPERTIES}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ophalen van dit bedrijf uit HubSpot is mislukt.";
    return { success: false, fout: message, klant: null };
  }

  const naam = company.properties.name?.trim();
  if (!naam) {
    return { success: false, fout: "Dit HubSpot-bedrijf heeft geen naam.", klant: null };
  }
  const adres = bouwAdres(company.properties);
  const patriciaId = company.properties.patriciaid?.trim() || null;

  const KLANT_VELDEN =
    "id, naam, adres, patricia_id, kantoorkosten_actief, kantoorkosten_percentage, specificatietaal, valuta";
  const supabase = await createClient();
  const { data: bestaandeKlant } = await supabase
    .from("klanten")
    .select(KLANT_VELDEN)
    .eq("hubspot_id", hubspotId)
    .maybeSingle();

  let klant: NieuweKlant | null = null;
  if (!bestaandeKlant) {
    const { data, error } = await supabase
      .from("klanten")
      .insert({ hubspot_id: hubspotId, naam, adres, patricia_id: patriciaId, status: "actief" })
      .select(KLANT_VELDEN)
      .single();
    if (error || !data) {
      return { success: false, fout: "Aanmaken van de klant is mislukt.", klant: null };
    }
    klant = data;
  } else {
    const aanvulling: { adres?: string; patricia_id?: string } = {};
    if (!bestaandeKlant.adres && adres) aanvulling.adres = adres;
    if (!bestaandeKlant.patricia_id && patriciaId) aanvulling.patricia_id = patriciaId;

    if (Object.keys(aanvulling).length > 0) {
      const { data, error } = await supabase
        .from("klanten")
        .update(aanvulling)
        .eq("id", bestaandeKlant.id)
        .select(KLANT_VELDEN)
        .single();
      if (error || !data) {
        return { success: false, fout: "Bijwerken van de klant is mislukt.", klant: null };
      }
      klant = data;
    } else {
      klant = bestaandeKlant;
    }
  }

  revalidatePath("/factuuritems");
  return { success: true, fout: null, klant };
}
