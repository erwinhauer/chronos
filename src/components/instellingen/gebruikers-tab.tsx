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
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusDot } from "@/components/ui/status-dot";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTh } from "@/components/sortable-th";
import { tagKleurStijl } from "@/lib/tag-kleur";
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
  voornaam: string;
  achternaam: string;
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
  rolIdsPerProfile,
}: {
  profiles: ProfileRow[];
  teams: Team[];
  teamIdsPerProfile: Record<string, string[]>;
  rolIdsPerProfile: Record<string, UserRole[]>;
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
                    huidigeRolIds={rolIdsPerProfile[p.id] ?? [p.role]}
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
  huidigeRolIds,
}: {
  profile: ProfileRow;
  teams: Team[];
  huidigeTeamIds: string[];
  huidigeRolIds: UserRole[];
}) {
  const teamNamen = teams.filter((t) => huidigeTeamIds.includes(t.id)).map((t) => t.naam);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <AvatarInitials naam={profile.full_name} />
          <div>
            <div className="font-medium">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">{profile.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {huidigeRolIds.map((role) => (
            <Badge key={role} variant="outline" className="text-xs" style={tagKleurStijl(ROLE_LABELS[role])}>
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        {teamNamen.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {teamNamen.map((naam) => (
              <Badge key={naam} variant="outline" className="text-xs" style={tagKleurStijl(naam)}>
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
        <StatusDot label={profile.actief ? "Actief" : "Inactief"} tint={profile.actief ? "success" : "muted"} />
      </TableCell>
      <TableCell className="text-right">
        <GebruikerBewerkenDialog
          profile={profile}
          teams={teams}
          huidigeTeamIds={huidigeTeamIds}
          huidigeRolIds={huidigeRolIds}
        />
      </TableCell>
    </TableRow>
  );
}

const initialState: UpdateGebruikerFormState = { error: null, success: false };

function GebruikerBewerkenDialog({
  profile,
  teams,
  huidigeTeamIds,
  huidigeRolIds,
}: {
  profile: ProfileRow;
  teams: Team[];
  huidigeTeamIds: string[];
  huidigeRolIds: UserRole[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: UpdateGebruikerFormState, formData: FormData) => {
    const result = await updateGebruiker(profile.id, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);
  const [voornaam, setVoornaam] = useState(profile.voornaam);
  const [achternaam, setAchternaam] = useState(profile.achternaam);
  const [roleIds, setRoleIds] = useState<UserRole[]>(huidigeRolIds);
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
          {roleIds.map((role) => (
            <input key={role} type="hidden" name="role_ids" value={role} />
          ))}
          <DialogHeader>
            <DialogTitle>{profile.full_name}</DialogTitle>
            <DialogDescription>{profile.email}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Voornaam</label>
              <Input name="voornaam" value={voornaam} onChange={(e) => setVoornaam(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Achternaam</label>
              <Input name="achternaam" value={achternaam} onChange={(e) => setAchternaam(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Initialen</label>
            <Input
              name="initialen"
              className="w-20 uppercase"
              maxLength={3}
              value={initialen}
              onChange={(e) => setInitialen(e.target.value.toUpperCase().slice(0, 3))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={actief} onCheckedChange={(checked) => setActief(checked === true)} />
            Actief
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Rollen</label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={roleIds.includes(value as UserRole)}
                    onCheckedChange={(checked) =>
                      setRoleIds((prev) =>
                        checked === true
                          ? [...prev, value as UserRole]
                          : prev.filter((role) => role !== (value as UserRole))
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

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
