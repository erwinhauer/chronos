"use client";

import { useActionState } from "react";
import { logInMetWachtwoord, type WachtwoordLoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WachtwoordLoginState = { error: null };

export function LoginForm({ next, foutmelding }: { next: string; foutmelding?: string }) {
  const [state, formAction, pending] = useActionState(logInMetWachtwoord, initialState);

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
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="wachtwoord">Wachtwoord</Label>
        <Input id="wachtwoord" name="wachtwoord" type="password" autoComplete="current-password" required />
      </div>
      {foutmelding === "verlopen" && (
        <p role="alert" className="text-sm text-destructive">
          Je sessie is verlopen of ongeldig. Log opnieuw in.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Bezig met inloggen…" : "Inloggen"}
      </Button>
    </form>
  );
}
