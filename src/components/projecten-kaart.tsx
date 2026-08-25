"use client";

import { useActionState, useState } from "react";
import { updateProject, type ProjectFormState } from "@/actions/projecten";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export type Project = {
  id: string;
  naam: string;
  po_nummer: string | null;
  omschrijving: string | null;
  actief: boolean;
};

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
      <div className="flex flex-col gap-1">
        <Label htmlFor={`omschrijving-${project.id}`} className="text-xs text-muted-foreground">
          Omschrijving (optioneel)
        </Label>
        <Textarea
          id={`omschrijving-${project.id}`}
          name="omschrijving"
          rows={2}
          defaultValue={project.omschrijving ?? ""}
        />
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
