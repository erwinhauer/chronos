"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

export type AuditlogRij = {
  id: string;
  actie: string;
  object_type: string;
  object_id: string | null;
  oude_waarde: Record<string, unknown> | null;
  nieuwe_waarde: Record<string, unknown> | null;
  created_at: string;
  gebruikerNaam: string | null;
};

const OBJECT_TYPE_LABEL: Record<string, string> = {
  klanten: "Klant",
  factuuritems: "Factuuritem",
  facturatiebatches: "Specificatie",
  tarieven: "Tarief",
  profiles: "Gebruiker",
};

// Kolommen die op elke rij staan maar geen inhoudelijke wijziging zijn.
const NEGEER_VELDEN = new Set(["id", "created_at", "updated_at"]);

function formatDatumTijd(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWaarde(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function labelVoorRij(objectType: string, rij: Record<string, unknown> | null): string | null {
  if (!rij) return null;
  if (objectType === "klanten") return (rij.naam as string | undefined) ?? null;
  if (objectType === "factuuritems") return (rij.omschrijving_klant as string | undefined) ?? null;
  if (objectType === "profiles") return (rij.full_name as string | undefined) ?? null;
  if (objectType === "tarieven" && typeof rij.tarief === "number") return `€${(rij.tarief as number).toFixed(2)}`;
  return null;
}

function gewijzigdeVelden(
  oud: Record<string, unknown> | null,
  nieuw: Record<string, unknown> | null
): { veld: string; oud: unknown; nieuw: unknown }[] {
  if (!oud || !nieuw) return [];
  const alleVelden = new Set([...Object.keys(oud), ...Object.keys(nieuw)]);
  const verschillen: { veld: string; oud: unknown; nieuw: unknown }[] = [];
  for (const veld of alleVelden) {
    if (NEGEER_VELDEN.has(veld)) continue;
    if (JSON.stringify(oud[veld]) !== JSON.stringify(nieuw[veld])) {
      verschillen.push({ veld, oud: oud[veld], nieuw: nieuw[veld] });
    }
  }
  return verschillen;
}

function formatGrootte(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function AuditlogTab({
  rijen,
  totaalAantal,
  opslaggrootteBytes,
}: {
  rijen: AuditlogRij[];
  totaalAantal: number;
  opslaggrootteBytes: number | null;
}) {
  const [filter, setFilter] = useState<string>("alle");

  const objectTypes = useMemo(() => Array.from(new Set(rijen.map((r) => r.object_type))).sort(), [rijen]);
  const zichtbareRijen = filter === "alle" ? rijen : rijen.filter((r) => r.object_type === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Wie heeft wat aangemaakt of gewijzigd op klanten, factuuritems, specificaties en tarieven. Wordt na 60
          dagen automatisch opgeruimd — nu {formatGrootte(opslaggrootteBytes)} aan opslag.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
          >
            <option value="alle">Alle objecttypen</option>
            {objectTypes.map((t) => (
              <option key={t} value={t}>
                {OBJECT_TYPE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {totaalAantal > rijen.length && (
        <p className="text-xs text-muted-foreground">
          Toont de meest recente {rijen.length} van in totaal {totaalAantal} log-regels.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {zichtbareRijen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Geen log-regels.</p>
        ) : (
          zichtbareRijen.map((rij) => {
            const isVerwijderd = rij.oude_waarde !== null && rij.nieuwe_waarde === null;
            const isAangemaakt = rij.actie === "aanmaken";
            const label =
              labelVoorRij(rij.object_type, rij.nieuwe_waarde ?? rij.oude_waarde) ??
              `${OBJECT_TYPE_LABEL[rij.object_type] ?? rij.object_type} ${rij.object_id?.slice(0, 8) ?? ""}`;
            const verschillen = isAangemaakt || isVerwijderd ? [] : gewijzigdeVelden(rij.oude_waarde, rij.nieuwe_waarde);

            return (
              <div key={rij.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{OBJECT_TYPE_LABEL[rij.object_type] ?? rij.object_type}</Badge>
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {isAangemaakt ? "aangemaakt" : isVerwijderd ? "verwijderd" : "gewijzigd"}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {rij.gebruikerNaam ?? "Onbekend"} · {formatDatumTijd(rij.created_at)}
                  </span>
                </div>
                {verschillen.length > 0 && (
                  <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
                    {verschillen.map((v) => (
                      <p key={v.veld} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{v.veld}: </span>
                        {formatWaarde(v.oud)} <span className="mx-1">→</span> {formatWaarde(v.nieuw)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
