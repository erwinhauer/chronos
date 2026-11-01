"use client";

import type { ReactNode } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, Users } from "lucide-react";

export type TeamledenAccordeonItem = {
  id: string;
  naam: string;
  aantalLeden: number;
  // Al opgemaakt (bv. "€ 3.010") zodat dit client-onderdeel geen bedragen hoeft te formatteren.
  totaalTekst: string;
  children: ReactNode;
};

// Uitklapbaar overzicht van de teamleden per team: dicht is het één rustige regel per team
// (naam, aantal leden, jaartotaal), open zie je de KPI-kaart per teamlid. Meerdere teams kunnen
// tegelijk openstaan, zodat je ze naast elkaar kunt vergelijken.
export function TeamledenAccordeon({ items }: { items: TeamledenAccordeonItem[] }) {
  return (
    <Accordion.Root multiple className="flex flex-col gap-3">
      {items.map((item) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className="overflow-hidden rounded-[24px] bg-tint ring-1 ring-border transition-shadow data-[open]:ring-foreground/30"
        >
          <Accordion.Header className="m-0">
            <Accordion.Trigger className="group flex w-full items-center gap-4 p-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">{item.naam}</span>
                <span className="block text-sm text-muted-foreground">
                  {item.aantalLeden} {item.aantalLeden === 1 ? "teamlid" : "teamleden"} ·{" "}
                  <span className="group-data-[panel-open]:hidden">klik om de KPI&apos;s te tonen</span>
                  <span className="hidden group-data-[panel-open]:inline">klik om in te klappen</span>
                </span>
              </span>
              <span className="text-xl font-normal tabular-figures">{item.totaalTekst}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border transition-colors group-hover:bg-coral group-hover:text-coral-foreground">
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div className="px-5 pt-1 pb-5">{item.children}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
