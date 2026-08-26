"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { NewKlantDialog } from "@/components/new-klant-dialog";
import { zoekHubspotKlanten, importeerHubspotKlant, type HubspotZoekresultaat } from "@/actions/hubspot";
import { deactiveerKlant, type NieuweKlant } from "@/actions/klanten";
import { fuzzyFilter } from "@/lib/fuzzy-match";
import { Input } from "@/components/ui/input";

type Klant = { id: string; naam: string };

export function KlantCombobox({
  klanten,
  value,
  onChange,
  onKlantAangemaakt,
  magHubspotImporteren = false,
  magKlantenVerwijderen = false,
}: {
  klanten: Klant[];
  value: string;
  onChange: (klantId: string) => void;
  onKlantAangemaakt: (klant: NieuweKlant) => void;
  magHubspotImporteren?: boolean;
  magKlantenVerwijderen?: boolean;
}) {
  const [invoer, setInvoer] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hubspotResultaten, setHubspotResultaten] = useState<HubspotZoekresultaat[]>([]);
  const [hubspotZoekPending, setHubspotZoekPending] = useState(false);
  const [hubspotZoekFout, setHubspotZoekFout] = useState<string | null>(null);
  const [importerenId, setImporterenId] = useState<string | null>(null);
  const [importFout, setImportFout] = useState<Record<string, string>>({});
  const zoekTokenRef = useRef(0);

  const [verwijderdeIds, setVerwijderdeIds] = useState<Set<string>>(new Set());
  const [bevestigVerwijderId, setBevestigVerwijderId] = useState<string | null>(null);
  const [verwijderenBezigId, setVerwijderenBezigId] = useState<string | null>(null);

  const geselecteerd = klanten.find((k) => k.id === value);

  const zichtbareKlanten = useMemo(
    () => klanten.filter((k) => !verwijderdeIds.has(k.id)),
    [klanten, verwijderdeIds]
  );

  const matches = useMemo(() => {
    if (!invoer.trim()) return zichtbareKlanten.slice(0, 8);
    return fuzzyFilter(zichtbareKlanten, invoer, (k) => k.naam).slice(0, 8);
  }, [zichtbareKlanten, invoer]);

  async function verwijderKlant(klantId: string) {
    setVerwijderenBezigId(klantId);
    const res = await deactiveerKlant(klantId);
    setVerwijderenBezigId(null);
    setBevestigVerwijderId(null);
    if (res.success) {
      setVerwijderdeIds((prev) => new Set(prev).add(klantId));
    }
  }

  // Live meezoeken in HubSpot terwijl je typt — geen apart "importeren"-scherm
  // meer, gewoon één doorzoekbare lijst met bedrijven om uit te kiezen.
  useEffect(() => {
    const term = invoer.trim();
    if (!magHubspotImporteren || !open || !term) {
      return;
    }
    const token = ++zoekTokenRef.current;
    const timer = window.setTimeout(() => {
      setHubspotZoekPending(true);
      zoekHubspotKlanten(term).then((res) => {
        if (zoekTokenRef.current !== token) return;
        setHubspotZoekPending(false);
        setHubspotZoekFout(res.fout);
        setHubspotResultaten(res.fout ? [] : res.resultaten.filter((r) => !r.bestaatAl));
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [invoer, open, magHubspotImporteren]);

  function kiesKlant(klant: Klant) {
    onChange(klant.id);
    setInvoer("");
    setOpen(false);
  }

  async function importeren(result: HubspotZoekresultaat) {
    setImporterenId(result.hubspotId);
    setImportFout((prev) => ({ ...prev, [result.hubspotId]: "" }));
    const res = await importeerHubspotKlant(result.hubspotId);
    setImporterenId(null);
    if (res.success && res.klant) {
      onKlantAangemaakt(res.klant);
      onChange(res.klant.id);
      setInvoer("");
      setOpen(false);
    } else {
      setImportFout((prev) => ({ ...prev, [result.hubspotId]: res.fout ?? "Importeren is mislukt." }));
    }
  }

  // Effect zet deze alleen tijdens een actieve zoekopdracht — buiten die
  // situatie (dropdown dicht, geen zoekterm) maskeren we een verouderde
  // waarde hier, in plaats van 'm ook nog synchroon te resetten in het effect.
  const toontHubspot = magHubspotImporteren && open && invoer.trim().length > 0;
  const getoondeHubspotResultaten = toontHubspot ? hubspotResultaten : [];
  const toontHubspotPending = toontHubspot && hubspotZoekPending;
  const getoondeHubspotFout = toontHubspot && !hubspotZoekPending ? hubspotZoekFout : null;
  const geenResultaten =
    matches.length === 0 && getoondeHubspotResultaten.length === 0 && !toontHubspotPending && !getoondeHubspotFout;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={open ? invoer : geselecteerd?.naam ?? ""}
          onChange={(e) => {
            setInvoer(e.target.value);
            if (value) onChange("");
          }}
          onFocus={() => {
            setInvoer("");
            setOpen(true);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setInvoer("");
            }, 150)
          }
          placeholder="Typ om een klant te zoeken…"
          className="pl-8"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-md">
          {matches.length > 0 && (
            <div className="flex flex-col">
              {matches.map((k) => {
                if (magKlantenVerwijderen && bevestigVerwijderId === k.id) {
                  const bezig = verwijderenBezigId === k.id;
                  return (
                    <div key={k.id} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm">
                      <span className="flex-1 truncate text-muted-foreground">Verwijderen als klant?</span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setBevestigVerwijderId(null)}
                        className="rounded-md px-1.5 py-0.5 text-xs hover:bg-accent"
                      >
                        Nee
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => verwijderKlant(k.id)}
                        disabled={bezig}
                        className="rounded-md px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {bezig ? "Bezig…" : "Ja, verwijderen"}
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={k.id} className="flex items-center rounded-md hover:bg-accent">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => kiesKlant(k)}
                      className="flex-1 px-2.5 py-1.5 text-left text-sm"
                    >
                      {k.naam}
                    </button>
                    {magKlantenVerwijderen && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setBevestigVerwijderId(k.id)}
                        className="px-2 py-1.5 text-muted-foreground hover:text-destructive"
                        title="Klant verwijderen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(getoondeHubspotResultaten.length > 0 || toontHubspotPending) && (
            <div
              className={
                matches.length > 0 ? "mt-1 flex flex-col border-t border-border pt-1" : "flex flex-col"
              }
            >
              <p className="px-2.5 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Uit HubSpot
              </p>
              {toontHubspotPending ? (
                <p className="px-2.5 py-1.5 text-sm text-muted-foreground">Zoeken…</p>
              ) : (
                getoondeHubspotResultaten.map((r) => {
                  const fout = importFout[r.hubspotId];
                  const bezig = importerenId === r.hubspotId;
                  return (
                    <div key={r.hubspotId} className="flex flex-col">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => importeren(r)}
                        disabled={bezig}
                        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{r.naam}</span>
                        {r.patriciaId && (
                          <span className="shrink-0 text-xs text-muted-foreground">PNN {r.patriciaId}</span>
                        )}
                        {bezig && <span className="text-xs text-muted-foreground">Bezig…</span>}
                      </button>
                      {fout && <p className="px-2.5 pb-1 text-xs text-destructive">{fout}</p>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {geenResultaten && <p className="px-2.5 py-1.5 text-sm text-muted-foreground">Geen klanten gevonden.</p>}
          {getoondeHubspotFout && (
            <p className="px-2.5 py-1.5 text-sm text-destructive">Zoeken in HubSpot mislukt: {getoondeHubspotFout}</p>
          )}

          <div className="mt-1 border-t border-border pt-1" onMouseDown={(e) => e.preventDefault()}>
            <NewKlantDialog
              initialNaam={invoer.trim()}
              onCreated={(klant) => {
                onKlantAangemaakt(klant);
                onChange(klant.id);
                setInvoer("");
                setOpen(false);
              }}
              trigger={
                <>
                  <Plus className="h-4 w-4" />
                  Nieuwe klant aanmaken{invoer.trim() ? ` "${invoer.trim()}"` : ""}
                </>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
