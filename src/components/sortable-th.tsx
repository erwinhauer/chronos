"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { SortRichting } from "@/lib/table-utils";

export function SortableTh({
  label,
  actief,
  richting,
  onClick,
  className,
}: {
  label: string;
  actief: boolean;
  richting: SortRichting;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !actief ? ChevronsUpDown : richting === "asc" ? ChevronUp : ChevronDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1 font-medium hover:text-foreground ${
          className?.includes("text-right") ? "justify-end text-right" : "text-left"
        }`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${actief ? "text-foreground" : "text-muted-foreground"}`} />
      </button>
    </TableHead>
  );
}
