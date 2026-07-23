export type SortRichting = "asc" | "desc";

export function sortRows<T>(rows: T[], key: (row: T) => string | number, richting: SortRichting): T[] {
  const factor = richting === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = key(a);
    const vb = key(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
    return String(va).localeCompare(String(vb)) * factor;
  });
}
