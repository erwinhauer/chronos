"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { wijzigEigenWachtwoord, type WachtwoordState } from "@/actions/wachtwoord";
import { WACHTWOORD_REGELS } from "@/lib/wachtwoord-validatie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WachtwoordState = { error: null, success: false };

export function WachtwoordWijzigenForm() {
  const [state, formAction, pending] = useActionState(wijzigEigenWachtwoord, initialState);
  const [nieuw, setNieuw] = useState("");
  const [bevestig, setBevestig] = useState("");

  const alleRegelsOk = WACHTWOORD_REGELS.every((regel) => regel.voldoet(nieuw));
  const komenOvereen = bevestig.length > 0 && nieuw === bevestig;

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Wachtwoord gewijzigd</p>
        <p className="text-sm text-muted-foreground">Je kunt nu verder met Chronos.</p>
        <Button className="w-full" onClick={() => (window.location.href = "/dashboard")}>
          Naar het dashboard
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nieuw_wachtwoord">Nieuw wachtwoord</Label>
        <Input
          id="nieuw_wachtwoord"
          name="nieuw_wachtwoord"
          type="password"
          autoComplete="new-password"
          required
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bevestig_wachtwoord">Bevestig nieuw wachtwoord</Label>
        <Input
          id="bevestig_wachtwoord"
          name="bevestig_wachtwoord"
          type="password"
          autoComplete="new-password"
          required
          value={bevestig}
          onChange={(e) => setBevestig(e.target.value)}
        />
        {bevestig.length > 0 && !komenOvereen && (
          <p className="text-xs text-destructive">De wachtwoorden komen niet overeen.</p>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {WACHTWOORD_REGELS.map((regel) => {
          const voldoet = regel.voldoet(nieuw);
          return (
            <li
              key={regel.label}
              className={`flex items-center gap-2 text-sm ${voldoet ? "text-success" : "text-muted-foreground"}`}
            >
              {voldoet ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
              {regel.label}
            </li>
          );
        })}
      </ul>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending || !alleRegelsOk || !komenOvereen} className="w-full">
        {pending ? "Bezig…" : "Wachtwoord instellen"}
      </Button>
    </form>
  );
}
