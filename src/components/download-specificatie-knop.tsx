"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { genereerSpecificatiePdfBase64 } from "@/actions/specificatie-download";
import { Button } from "@/components/ui/button";

export function DownloadSpecificatieKnop({ specificatieId }: { specificatieId: string }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function downloaden() {
    setBezig(true);
    setFout(null);
    const { base64, filename, error } = await genereerSpecificatiePdfBase64(specificatieId);
    setBezig(false);
    if (error || !base64 || !filename) {
      setFout(error ?? "Downloaden is mislukt.");
      return;
    }
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" disabled={bezig} onClick={downloaden}>
        <Download className="h-4 w-4" />
        {bezig ? "Bezig…" : "Download specificatie (PDF)"}
      </Button>
      {fout && <p className="text-xs text-destructive">{fout}</p>}
    </div>
  );
}
