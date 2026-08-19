"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

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
      <div className="relative flex flex-col gap-2">
        <Label htmlFor="password">Wachtwoord</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {/* Na de input in de DOM (i.p.v. ervoor) zodat Tab vanuit e-mailadres naar dit
            veld gaat in plaats van naar deze link — visueel blijft de plek ongewijzigd. */}
        <Link
          href="/wachtwoord-vergeten"
          className="absolute right-0 top-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Wachtwoord vergeten?
        </Link>
      </div>
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
