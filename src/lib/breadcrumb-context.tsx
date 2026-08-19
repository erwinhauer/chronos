"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type BreadcrumbSegment = { label: string; href?: string };

const BreadcrumbContext = createContext<{
  segments: BreadcrumbSegment[] | null;
  setSegments: (segments: BreadcrumbSegment[] | null) => void;
} | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [segments, setSegments] = useState<BreadcrumbSegment[] | null>(null);
  return <BreadcrumbContext.Provider value={{ segments, setSegments }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbSegments() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error("useBreadcrumbSegments moet binnen BreadcrumbProvider gebruikt worden.");
  return ctx;
}

// Door een Server Component gerenderd op detailpagina's om de header een
// specifiek pad te geven (bv. "Klanten / Arcadis") in plaats van de vlakke
// top-level titel. Reset zichzelf bij unmount zodat een volgende pagina
// zonder eigen breadcrumb niet per ongeluk de vorige overneemt.
export function SetBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  const { setSegments } = useBreadcrumbSegments();
  useEffect(() => {
    setSegments(segments);
    return () => setSegments(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(segments)]);
  return null;
}
