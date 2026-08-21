"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { haalFactuurDownloadUrl } from "@/actions/factuur-download";
import { Button } from "@/components/ui/button";

export function DownloadFactuurKnop({
  batchId,
  soort,
  label,
}: {
  batchId: string;
  soort: "factuur" | "specificatie";
  label: string;
}) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function downloaden() {
    setBezig(true);
    setFout(null);
    const { url, error } = await haalFactuurDownloadUrl(batchId, soort);
    setBezig(false);
    if (error || !url) {
      setFout(error ?? "Downloaden is mislukt.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" disabled={bezig} onClick={downloaden}>
        <Download className="h-4 w-4" />
        {bezig ? "Bezig…" : label}
      </Button>
      {fout && <p className="text-xs text-destructive">{fout}</p>}
    </div>
  );
}
