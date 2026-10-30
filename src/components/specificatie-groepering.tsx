"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SpecificatieGroeperingWaarde = { groepeer: boolean; setGroepeer: (waarde: boolean) => void };

// De "Group by matter"-switch zit in de specificatie-preview, maar de
// downloadknop (concept of definitief) staat er los van — deze context deelt de
// keuze, zodat de PDF dezelfde groepering krijgt als de preview.
export const SpecificatieGroeperingContext = createContext<SpecificatieGroeperingWaarde | null>(null);

export function SpecificatieGroeperingProvider({ children }: { children: ReactNode }) {
  const [groepeer, setGroepeer] = useState(false);
  return (
    <SpecificatieGroeperingContext.Provider value={{ groepeer, setGroepeer }}>
      {children}
    </SpecificatieGroeperingContext.Provider>
  );
}

export function useSpecificatieGroepering() {
  return useContext(SpecificatieGroeperingContext);
}
