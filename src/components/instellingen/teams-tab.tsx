"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import { createTeam, setTeamLeden, type TeamFormState } from "@/actions/admin";
import { setTeamdoel } from "@/actions/teamdoelen";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTh } from "@/components/sortable-th";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { euro } from "@/lib/factuurbedragen";
import { sortRows, type SortRichting } from "@/lib/table-utils";

type Profile = { id: string; full_name: string };
type Team = { id: string; naam: string };
type SortKey = "naam" | "leden" | "doel";

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
  const [zoek, setZoek] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("naam");
  const [sortRichting, setSortRichting] = useState<SortRichting>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortRichting((r) => (r === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortRichting("asc");
    }
  }

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const gefilterd = q ? teams.filter((t) => t.naam.toLowerCase().includes(q)) : teams;
    const keyFn = {
      naam: (t: Team) => t.naam,
      leden: (t: Team) => (ledenPerTeam[t.id] ?? []).length,
      doel: (t: Team) => doelPerTeam[t.id] ?? 0,
    }[sortKey];
    return sortRows(gefilterd, keyFn, sortRichting);
  }, [teams, zoek, sortKey, sortRichting, ledenPerTeam, doelPerTeam]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op teamnaam…" className="pl-8" />
        </div>
        <NewTeamDialog />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh label="Naam" actief={sortKey === "naam"} richting={sortRichting} onClick={() => toggleSort("naam")} />
                <SortableTh
                  label="Leden"
                  actief={sortKey === "leden"}
                  richting={sortRichting}
                  onClick={() => toggleSort("leden")}
                />
                <SortableTh
                  label={`Jaardoel ${jaar}`}
                  actief={sortKey === "doel"}
                  richting={sortRichting}
                  onClick={() => toggleSort("doel")}
                />
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zichtbaar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    {teams.length === 0 ? "Nog geen teams aangemaakt." : "Geen teams gevonden."}
                  </TableCell>
                </TableRow>
              ) : (
                zichtbaar.map((team) => (
                  <TeamRij
                    key={team.id}
                    team={team}
                    profiles={profiles}
                    huidigeLeden={ledenPerTeam[team.id] ?? []}
                    huidigDoel={doelPerTeam[team.id]}
                    jaar={jaar}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamRij({
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
  return (
    <TableRow>
      <TableCell className="font-medium">{team.naam}</TableCell>
      <TableCell className="tabular-figures">{huidigeLeden.length}</TableCell>
      <TableCell className="tabular-figures">{huidigDoel !== undefined ? euro(huidigDoel) : "—"}</TableCell>
      <TableCell className="text-right">
        <TeamBewerkenDialog team={team} profiles={profiles} huidigeLeden={huidigeLeden} huidigDoel={huidigDoel} jaar={jaar} />
      </TableCell>
    </TableRow>
  );
}

function TeamBewerkenDialog({
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
  const [open, setOpen] = useState(false);
  const [leden, setLeden] = useState<string[]>(huidigeLeden);
  const [doel, setDoel] = useState(huidigDoel !== undefined ? String(huidigDoel) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function opslaan() {
    startTransition(async () => {
      setError(null);
      try {
        const acties = [setTeamLeden(team.id, leden)];
        if (doel.trim() !== "") acties.push(setTeamdoel(team.id, jaar, Number(doel)));
        await Promise.all(acties);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Opslaan is mislukt.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="h-4 w-4" />
        Bewerken
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{team.naam}</DialogTitle>
            <DialogDescription>Leden en jaardoel beheren.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label>Leden</Label>
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
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`doel-${team.id}`}>Jaardoel {jaar}</Label>
            <Input
              id={`doel-${team.id}`}
              type="number"
              step="1000"
              min="0"
              value={doel}
              onChange={(e) => setDoel(e.target.value)}
              placeholder="Bijv. 250000"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="button" disabled={pending} onClick={opslaan}>
              {pending ? "Bezig…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
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
