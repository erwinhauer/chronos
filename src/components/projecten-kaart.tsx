"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createProject, updateProject, type ProjectFormState } from "@/actions/projecten";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type Project = { id: string; naam: string; po_nummer: string | null; actief: boolean };

const initialState: ProjectFormState = { error: null, success: false };

export function ProjectenKaart({ klantId, projecten }: { klantId: string; projecten: Project[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Projecten</CardTitle>
        <NewProjectDialog klantId={klantId} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {projecten.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen projecten. Zonder project wordt gewoon direct op klantniveau gefactureerd.
          </p>
        ) : (
          projecten.map((project) => <ProjectRow key={project.id} project={project} />)
        )}
      </CardContent>
    </Card>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const [state, formAction, pending] = useActionState(updateProject.bind(null, project.id), initialState);
  const [actief, setActief] = useState(project.actief);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="actief" value={actief ? "on" : ""} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`naam-${project.id}`} className="text-xs text-muted-foreground">
            Projectnaam
          </Label>
          <Input id={`naam-${project.id}`} name="naam" defaultValue={project.naam} required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`po-${project.id}`} className="text-xs text-muted-foreground">
            PO-nummer
          </Label>
          <Input id={`po-${project.id}`} name="po_nummer" defaultValue={project.po_nummer ?? ""} />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={actief} onCheckedChange={(checked) => setActief(checked === true)} />
            Actief
          </label>
          {!actief && (
            <Badge variant="outline" className="text-xs">
              Inactief
            </Badge>
          )}
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Bezig…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}

function NewProjectDialog({ klantId }: { klantId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ProjectFormState, formData: FormData) => {
    const result = await createProject(klantId, prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="h-4 w-4" />
        Nieuw project
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nieuw project aanmaken</DialogTitle>
            <DialogDescription>
              Projecten laten toe om werk voor deze klant apart te factureren, elk met een eigen PO-nummer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="naam">Projectnaam</Label>
            <Input id="naam" name="naam" placeholder="Bijv. Merkenportefeuille EU" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="po_nummer">PO-nummer (optioneel)</Label>
            <Input id="po_nummer" name="po_nummer" placeholder="Bijv. PO-2026-001" />
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
              {pending ? "Bezig…" : "Project aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
