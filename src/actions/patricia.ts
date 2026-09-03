"use server";

import { zoekDossierInfo, type PatriciaDossierInfo } from "@/lib/patricia";

/**
 * Client-aanroepbare wrapper rond de Patricia-lookup, gebruikt door
 * FactuurItemForm om bij het toevoegen van een dossiernummer automatisch de
 * dossiernaam (en, indien te herleiden, de klant) voor te stellen.
 */
export async function haalPatriciaDossierInfo(dossiernummer: string): Promise<PatriciaDossierInfo | null> {
  return zoekDossierInfo(dossiernummer);
}
