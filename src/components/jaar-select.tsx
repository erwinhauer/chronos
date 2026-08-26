"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function JaarSelect({ huidigJaar }: { huidigJaar: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const echtHuidigJaar = new Date().getFullYear();
  const jaren = [
    echtHuidigJaar,
    echtHuidigJaar - 1,
    echtHuidigJaar - 2,
    echtHuidigJaar - 3,
    echtHuidigJaar - 4,
  ];

  function onChange(waarde: string) {
    const params = new URLSearchParams(searchParams);
    if (Number(waarde) === echtHuidigJaar) params.delete("jaar");
    else params.set("jaar", waarde);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
  }

  return (
    <select
      value={huidigJaar}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {jaren.map((j) => (
        <option key={j} value={j}>
          {j}
        </option>
      ))}
    </select>
  );
}
