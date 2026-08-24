"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { HubspotTab } from "@/components/instellingen/hubspot-tab";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function HubspotImportDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        Importeren uit HubSpot
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Klant importeren uit HubSpot</DialogTitle>
          <DialogDescription>Zoek een bedrijf op naam en importeer het als nieuwe klant.</DialogDescription>
        </DialogHeader>
        <HubspotTab showHeading={false} />
      </DialogContent>
    </Dialog>
  );
}
