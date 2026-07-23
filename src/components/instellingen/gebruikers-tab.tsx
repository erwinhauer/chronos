"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Pencil } from "lucide-react";
import { updateGebruiker, type UpdateGebruikerFormState } from "@/actions/admin";
import { NewGebruikerDialog } from "./new-gebruiker-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABELS } from "@/lib/nav";
import { suggestInitialen } from "@/lib/initials";
import { sortRows, type SortRichting } from "@/lib/table-utils";
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

type SortKey = "naam" | "rol" | "actief";

export function GebruikersTab({
  profiles,
  teams,
  teamIdsPerProfile,
}: {
  profiles: ProfileRow[];
  teams: Team[];
  teamIdsPerProfile: Record<string, string[]>;
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
    const gefilterd = q
      ? profiles.filter((p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      : profiles;
    const keyFn = {
      naam: (p: ProfileRow) => p.full_name,
      rol: (p: ProfileRow) => ROLE_LABELS[p.role],
      actief: (p: ProfileRow) => (p.actief ? 1 : 0),
    }[sortKey];
    return sortRows(gefilterd, keyFn, sortRichting);
  }, [profiles, zoek, sortKey, sortRichting]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek op naam of e-mail…"
            className="pl-8"
          />
        </div>
        <NewGebruikerDialog teams={teams} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh label="Naam" actief={sortKey === "naam"} richting={sortRichting} onClick={() => toggleSort("naam")} />
                <SortableTh label="Rol" actief={sortKey === "rol"} richting={sortRichting} onClick={() => toggleSort("rol")} />
                <TableHead>Teams</TableHead>
                <TableHead>Initialen</TableHead>
                <SortableTh
                  label="Actief"
                  actief={sortKey === "actief"}
                  richting={sortRichting}
                  onClick={() => toggleSort("actief")}
                />
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zichtbaar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Geen gebruikers gevonden.
                  </TableCell>
                </TableRow>
              ) : (
                zichtbaar.map((p) => (
                  <GebruikerRij
                    key={p.id}
                    profile={p}
                    teams={teams}
                    huidigeTeamIds={teamIdsPerProfile[p.id] ?? []}
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

function GebruikerRij({
  profile,
  teams,
  huidigeTeamIds,
}: {
  profile: ProfileRow;
  teams: Team[];
  huidigeTeamIds: string[];
}) {
  const teamNamen = teams.filter((t) => huidigeTeamIds.includes(t.id)).map((t) => t.naam);

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{profile.full_name}</div>
        <div className="text-xs text-muted-foreground">{profile.email}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
      </TableCell>
      <TableCell>
        {teamNamen.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {teamNamen.map((naam) => (
              <Badge key={naam} variant="secondary" className="text-xs">
                {naam}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="tabular-figures">{profile.initialen ?? suggestInitialen(profile.full_name)}</TableCell>
      <TableCell>
        <Badge variant={profile.actief ? "success" : "outline"} className="text-xs">
          {profile.actief ? "Actief" : "Inactief"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <GebruikerBewerkenDialog profile={profile} teams={teams} huidigeTeamIds={huidigeTeamIds} />
      </TableCell>
    </TableRow>
  );
}

const initialState: UpdateGebruikerFormState = { error: null, success: false };

function GebruikerBewerkenDialog({
  profile,
  teams,
  huidigeTeamIds,
}: {
  profile: ProfileRow;
  teams: Team[];
  huidigeTeamIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: UpdateGebruikerFormState, formData: FormData) => {
    const result = await updateGebruiker(profile.id, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);
  const [role, setRole] = useState<UserRole>(profile.role);
  const [actief, setActief] = useState(profile.actief);
  const [teamIds, setTeamIds] = useState<string[]>(huidigeTeamIds);
  const [initialen, setInitialen] = useState(profile.initialen ?? suggestInitialen(profile.full_name));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="h-4 w-4" />
        Bewerken
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="actief" value={actief ? "on" : ""} />
          {teamIds.map((id) => (
            <input key={id} type="hidden" name="team_ids" value={id} />
          ))}
          <DialogHeader>
            <DialogTitle>{profile.full_name}</DialogTitle>
            <DialogDescription>{profile.email}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Rol</label>
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
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Initialen</label>
              <Input
                name="initialen"
                className="uppercase"
                maxLength={3}
                value={initialen}
                onChange={(e) => setInitialen(e.target.value.toUpperCase().slice(0, 3))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={actief} onCheckedChange={(checked) => setActief(checked === true)} />
            Actief
          </label>

          {teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Teams</label>
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
            </div>
          )}

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
              {pending ? "Bezig…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
