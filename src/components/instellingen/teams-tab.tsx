"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTeam, setTeamLeden, type TeamFormState } from "@/actions/admin";
import { setTeamdoel } from "@/actions/teamdoelen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Profile = { id: string; full_name: string };
type Team = { id: string; naam: string };

export function TeamsTab({
  teams,
  profiles,
  ledenPerTeam,
  doelPerTeam,
  jaar,
}: {
  teams: Team[];
  profiles: Profile[];
  ledenPerTeam: Record<string, string[]>;
  doelPerTeam: Record<string, number>;
  jaar: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Teams bepalen wie elkaars factuuritems mag zien. Een gebruiker kan bij meerdere teams horen.
        </p>
        <NewTeamDialog />
      </div>
      <div className="flex flex-col gap-3">
        {teams.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nog geen teams aangemaakt.</p>
        ) : (
          teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              profiles={profiles}
              huidigeLeden={ledenPerTeam[team.id] ?? []}
              huidigDoel={doelPerTeam[team.id]}
              jaar={jaar}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TeamRow({
  team,
  profiles,
  huidigeLeden,
  huidigDoel,
  jaar,
}: {
  team: Team;
  profiles: Profile[];
  huidigeLeden: string[];
  huidigDoel?: number;
  jaar: number;
}) {
  const [leden, setLeden] = useState<string[]>(huidigeLeden);
  const [doel, setDoel] = useState(huidigDoel !== undefined ? String(huidigDoel) : "");
  const [pending, startTransition] = useTransition();
  const [doelPending, startDoelTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [doelError, setDoelError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{team.naam}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          {profiles.map((p) => (
            <label key={p.id} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={leden.includes(p.id)}
                onCheckedChange={(checked) =>
                  setLeden((prev) => (checked === true ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                }
              />
              {p.full_name}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await setTeamLeden(team.id, leden);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Opslaan is mislukt.");
                }
              })
            }
          >
            {pending ? "Bezig…" : "Leden opslaan"}
          </Button>
        </div>

        <div className="flex items-end gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`doel-${team.id}`} className="text-xs text-muted-foreground">
              Jaardoel {jaar}
            </Label>
            <Input
              id={`doel-${team.id}`}
              type="number"
              step="1000"
              min="0"
              className="w-40"
              value={doel}
              onChange={(e) => setDoel(e.target.value)}
              placeholder="Bijv. 250000"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={doelPending}
            onClick={() =>
              startDoelTransition(async () => {
                setDoelError(null);
                try {
                  await setTeamdoel(team.id, jaar, Number(doel));
                } catch (e) {
                  setDoelError(e instanceof Error ? e.message : "Opslaan is mislukt.");
                }
              })
            }
          >
            {doelPending ? "Bezig…" : "Doel opslaan"}
          </Button>
        </div>
        {doelError && (
          <p role="alert" className="text-sm text-destructive">
            {doelError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const initialTeamState: TeamFormState = { error: null, success: false };

function NewTeamDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: TeamFormState, formData: FormData) => {
    const result = await createTeam(prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialTeamState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Nieuw team
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nieuw team aanmaken</DialogTitle>
            <DialogDescription>Leden voeg je na het aanmaken toe.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="naam">Teamnaam</Label>
            <Input id="naam" name="naam" placeholder="Bijv. Team Benelux" required />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Bezig…" : "Team aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
