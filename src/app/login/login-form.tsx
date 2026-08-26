"use client";

import { useActionState, useEffect, useState } from "react";
import { stuurMagicLink, type MagicLinkState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: MagicLinkState = { error: null, success: false };
const HERVERSTUUR_WACHTTIJD = 30;

export function LoginForm({ next, foutmelding }: { next: string; foutmelding?: string }) {
  const [state, formAction, pending] = useActionState(stuurMagicLink, initialState);
  const [email, setEmail] = useState("");
  const [wachttijd, setWachttijd] = useState(0);

  // Start de wachttijd zodra deze actie een nieuw succes opleverde — tijdens
  // het renderen vergelijken met de vorige state (React's eigen patroon voor
  // "aanpassen op basis van een gewijzigde prop/state", zie de React-docs bij
  // useState) voorkomt een onnodige extra render-cascade via een effect.
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
            We hebben een inloglink gestuurd naar <span className="font-medium text-foreground">{email}</span>.
            Deze link is 5 minuten geldig.
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="outline" disabled={pending || wachttijd > 0} className="w-full">
            {wachttijd > 0 ? `Opnieuw versturen (${wachttijd}s)` : pending ? "Bezig…" : "Opnieuw versturen"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
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
      {foutmelding === "verlopen" && (
        <p role="alert" className="text-sm text-destructive">
          Deze inloglink is verlopen of ongeldig. Vraag hieronder een nieuwe aan.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Bezig met versturen…" : "Stuur inloglink"}
      </Button>
    </form>
  );
}
