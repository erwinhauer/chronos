"use client";

import { useActionState, useState } from "react";
import { updateGebruiker, type UpdateGebruikerFormState } from "@/actions/admin";
import { NewGebruikerDialog } from "./new-gebruiker-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_LABELS } from "@/lib/nav";
import { suggestInitialen } from "@/lib/initials";
import type { UserRole } from "@/lib/supabase/types";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  actief: boolean;
  initialen: string | null;
};
type Team = { id: string; naam: string };

export function GebruikersTab({
  profiles,
  teams,
  teamIdsPerProfile,
}: {
  profiles: ProfileRow[];
  teams: Team[];
  teamIdsPerProfile: Record<string, string[]>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Gebruikers, hun rol en teamlidmaatschap beheren.</p>
        <NewGebruikerDialog teams={teams} />
      </div>
      <div className="flex flex-col gap-3">
        {profiles.map((p) => (
          <GebruikerRow key={p.id} profile={p} teams={teams} huidigeTeamIds={teamIdsPerProfile[p.id] ?? []} />
        ))}
      </div>
    </div>
  );
}

const initialState: UpdateGebruikerFormState = { error: null, success: false };

function GebruikerRow({
  profile,
  teams,
  huidigeTeamIds,
}: {
  profile: ProfileRow;
  teams: Team[];
  huidigeTeamIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateGebruiker.bind(null, profile.id), initialState);
  const [role, setRole] = useState<UserRole>(profile.role);
  const [actief, setActief] = useState(profile.actief);
  const [teamIds, setTeamIds] = useState<string[]>(huidigeTeamIds);
  const [initialen, setInitialen] = useState(profile.initialen ?? suggestInitialen(profile.full_name));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="actief" value={actief ? "on" : ""} />
          {teamIds.map((id) => (
            <input key={id} type="hidden" name="team_ids" value={id} />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground">{profile.email}</div>
            </div>
            <Input
              name="initialen"
              className="w-20 uppercase"
              maxLength={3}
              value={initialen}
              onChange={(e) => setInitialen(e.target.value.toUpperCase().slice(0, 3))}
              aria-label="Initialen"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-8 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={actief} onCheckedChange={(checked) => setActief(checked === true)} />
              Actief
            </label>
          </div>

          {teams.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={teamIds.includes(t.id)}
                    onCheckedChange={(checked) =>
                      setTeamIds((prev) => (checked === true ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                    }
                  />
                  {t.naam}
                </label>
              ))}
            </div>
          )}

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Bezig…" : "Opslaan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
