"use client";

import { useActionState, useEffect, useState } from "react";
import { vraagWachtwoordResetAan, type WachtwoordVergetenState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WachtwoordVergetenState = { error: null, success: false };
const HERVERSTUUR_WACHTTIJD = 30;

export function WachtwoordVergetenForm() {
  const [state, formAction, pending] = useActionState(vraagWachtwoordResetAan, initialState);
  const [email, setEmail] = useState("");
  const [wachttijd, setWachttijd] = useState(0);

  // Zelfde patroon als de vroegere magic-link-flow: tijdens het renderen
  // vergelijken met de vorige state (React's eigen manier om op een
  // gewijzigde state te reageren) voorkomt een onnodige extra render-cascade
  // via een effect.
  const [vorigeState, setVorigeState] = useState(state);
  if (vorigeState !== state) {
    setVorigeState(state);
    if (state.success) setWachttijd(HERVERSTUUR_WACHTTIJD);
  }

  useEffect(() => {
    if (wachttijd <= 0) return;
    const timeout = setTimeout(() => setWachttijd((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearTimeout(timeout);
  }, [wachttijd]);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Check je e-mail</p>
          <p className="text-sm text-muted-foreground">
            Als <span className="font-medium text-foreground">{email}</span> bij ons bekend is, hebben we een link
            gestuurd om een nieuw wachtwoord te kiezen.
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="outline" disabled={pending || wachttijd > 0} className="w-full">
            {wachttijd > 0 ? `Opnieuw versturen (${wachttijd}s)` : pending ? "Bezig…" : "Opnieuw versturen"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="naam@knijff.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Bezig met versturen…" : "Verstuur reset-link"}
      </Button>
    </form>
  );
}
