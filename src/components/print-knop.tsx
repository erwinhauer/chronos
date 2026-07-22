"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintKnop() {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
