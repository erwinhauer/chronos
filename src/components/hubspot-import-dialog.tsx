"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { HubspotTab } from "@/components/instellingen/hubspot-tab";
import type { NieuweKlant } from "@/actions/klanten";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function HubspotImportDialog({
  onImported,
  trigger,
  size = "default",
  variant = "outline",
}: {
  onImported?: (klant: NieuweKlant) => void;
  trigger?: React.ReactNode;
  size?: "default" | "xs" | "sm";
  variant?: "outline" | "ghost";
} = {}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size={size} variant={variant} onClick={() => setOpen(true)}>
        {trigger ?? (
          <>
            <Download className="h-4 w-4" />
            Importeren uit HubSpot
          </>
        )}
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Klant importeren uit HubSpot</DialogTitle>
          <DialogDescription>Zoek een bedrijf op naam en importeer het als nieuwe klant.</DialogDescription>
        </DialogHeader>
        <HubspotTab
          showHeading={false}
          onImported={(klant) => {
            setOpen(false);
            onImported?.(klant);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
