"use client";

import { useState, useTransition } from "react";
import { Search, Download, Check } from "lucide-react";
import { zoekHubspotKlanten, importeerHubspotKlant, type HubspotZoekresultaat } from "@/actions/hubspot";
import type { NieuweKlant } from "@/actions/klanten";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HubspotTab({
  showHeading = true,
  onImported,
}: { showHeading?: boolean; onImported?: (klant: NieuweKlant) => void } = {}) {
  const [zoekterm, setZoekterm] = useState("");
  const [resultaten, setResultaten] = useState<HubspotZoekresultaat[] | null>(null);
  const [zoekFout, setZoekFout] = useState<string | null>(null);
  const [zoekPending, startZoeken] = useTransition();
  const [geimporteerd, setGeimporteerd] = useState<Set<string>>(new Set());
  const [importPending, setImportPending] = useState<string | null>(null);
  const [importFout, setImportFout] = useState<Record<string, string>>({});

  function zoeken() {
    setZoekFout(null);
    startZoeken(async () => {
      const res = await zoekHubspotKlanten(zoekterm);
      if (res.fout) setZoekFout(res.fout);
      setResultaten(res.resultaten);
    });
  }

  async function importeren(hubspotId: string) {
    setImportPending(hubspotId);
    setImportFout((prev) => ({ ...prev, [hubspotId]: "" }));
    const res = await importeerHubspotKlant(hubspotId);
    setImportPending(null);
    if (res.success) {
      setGeimporteerd((prev) => new Set(prev).add(hubspotId));
      if (res.klant) onImported?.(res.klant);
    } else {
      setImportFout((prev) => ({ ...prev, [hubspotId]: res.fout ?? "Importeren is mislukt." }));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {showHeading && (
          <div>
            <h3 className="text-sm font-medium">Klant importeren uit HubSpot</h3>
            <p className="text-sm text-muted-foreground">
              Tijdelijke oplossing tot de koppeling met Patricia er is. Zoek een bedrijf op naam en importeer het
              één voor één — bestaande klanten worden nooit overschreven (alleen een leeg adresveld wordt
              aangevuld). Vereist de omgevingsvariabele HUBSPOT_ACCESS_TOKEN.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  zoeken();
                }
              }}
              placeholder="Zoek op bedrijfsnaam…"
              className="pl-8"
            />
          </div>
          <Button type="button" variant="outline" onClick={zoeken} disabled={zoekPending || !zoekterm.trim()}>
            {zoekPending ? "Bezig…" : "Zoeken"}
          </Button>
        </div>

        {zoekFout && (
          <p role="alert" className="text-sm text-destructive">
            {zoekFout}
          </p>
        )}

        {resultaten && !zoekFout && (
          <div className="flex flex-col gap-2">
            {resultaten.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen bedrijven gevonden in HubSpot.</p>
            ) : (
              resultaten.map((r) => {
                const isGeimporteerd = r.bestaatAl || geimporteerd.has(r.hubspotId);
                const fout = importFout[r.hubspotId];
                return (
                  <div
                    key={r.hubspotId}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.naam}</p>
                      {r.adres && (
                        <p className="whitespace-pre-line text-xs text-muted-foreground">{r.adres}</p>
                      )}
                      {fout && <p className="text-xs text-destructive">{fout}</p>}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isGeimporteerd ? "outline" : "default"}
                      disabled={isGeimporteerd || importPending === r.hubspotId}
                      onClick={() => importeren(r.hubspotId)}
                    >
                      {isGeimporteerd ? (
                        <>
                          <Check className="h-4 w-4" />
                          Al geïmporteerd
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          {importPending === r.hubspotId ? "Bezig…" : "Importeren"}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
