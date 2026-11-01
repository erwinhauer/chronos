import { Plus } from "lucide-react";
import { LinkButton } from "@/components/link-button";

function vandaagLabel() {
  const nu = new Date();
  const weekdag = nu.toLocaleDateString("nl-NL", { weekday: "long", timeZone: "Europe/Amsterdam" });
  const datum = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
  return { weekdag: weekdag.charAt(0).toUpperCase() + weekdag.slice(1), datum };
}

// Begroeting met de datum van vandaag, plus de snelste route naar een nieuw factuuritem.
export function DashboardHero({ voornaam }: { voornaam: string }) {
  const { weekdag, datum } = vandaagLabel();
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-card p-8 ring-1 ring-border lg:col-span-2">
        <h2 className="text-5xl leading-[1.05] font-extralight tracking-tight lg:text-6xl">
          {weekdag}
          <br />
          {datum}
        </h2>
        <p className="mt-8 text-2xl font-light">
          Welkom, <span className="font-medium">{voornaam}</span>!
        </p>
        <p className="text-xl font-light text-coral-deep">
          Hier is het overzicht van Chronos.
        </p>
        <svg
          viewBox="0 0 380 272"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute top-5 right-4 hidden h-[250px] w-auto xl:block"
        >
          <rect x="40" y="40" width="270" height="190" rx="22" stroke="var(--ink)" strokeWidth="2" />
          <rect x="68" y="168" width="22" height="44" rx="4" fill="var(--coral)" />
          <rect x="100" y="138" width="22" height="74" rx="4" fill="var(--coral)" />
          <rect x="132" y="154" width="22" height="58" rx="4" fill="var(--coral)" />
          <rect x="164" y="118" width="22" height="94" rx="4" fill="var(--geel)" stroke="var(--ink)" strokeWidth="1.5" />
          <rect x="196" y="96" width="22" height="116" rx="4" fill="var(--coral)" />
          <rect x="228" y="74" width="22" height="138" rx="4" fill="var(--ink)" />
          <circle cx="306" cy="76" r="42" fill="var(--geel)" stroke="var(--ink)" strokeWidth="2" />
          <text x="306" y="90" textAnchor="middle" fontSize="38" fontWeight="300" fill="var(--ink)">
            €
          </text>
          <circle cx="352" cy="210" r="24" fill="var(--coral)" opacity=".85" />
          <circle cx="30" cy="252" r="8" fill="var(--coral)" />
        </svg>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-coral-soft p-8">
        <h3 className="text-2xl font-light tracking-tight">Nieuw factuuritem</h3>
        <p className="text-sm text-muted-foreground">Leg een werkzaamheid, uren of kosten vast op een dossier.</p>
        <LinkButton href="/factuuritems/nieuw" size="lg" className="mt-auto w-full uppercase tracking-wider">
          <Plus className="h-4 w-4" />
          Nieuw factuuritem
        </LinkButton>
      </div>
    </div>
  );
}
