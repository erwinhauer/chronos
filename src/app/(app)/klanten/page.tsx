import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { NewKlantDialog } from "@/components/new-klant-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function KlantenPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: klanten } = await supabase
    .from("klanten")
    .select(
      "id, naam, subtitel, status, contactpersoon_naam, contact_email, specificatietaal, specificatietype, kantoorkosten_actief, kantoorkosten_percentage, valuta"
    )
    .order("naam");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Klanten</h2>
          <p className="text-sm text-muted-foreground">
            Klantgegevens en specificatie-instellingen. Klik op een klant voor de factuurbedragen.
          </p>
        </div>
        {profile?.role === "beheerder" && <NewKlantDialog />}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klant</TableHead>
                <TableHead>Contactpersoon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Taal</TableHead>
                <TableHead>Specificatietype</TableHead>
                <TableHead>Kantoorkosten</TableHead>
                <TableHead>Valuta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {klanten && klanten.length > 0 ? (
                klanten.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">
                      <Link href={`/klanten/${k.id}`} className="hover:underline">
                        {k.naam}
                      </Link>
                      {k.subtitel && <div className="text-xs font-normal text-muted-foreground">{k.subtitel}</div>}
                    </TableCell>
                    <TableCell>
                      <div>{k.contactpersoon_naam ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{k.contact_email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.status === "actief" ? "default" : "outline"} className="text-xs">
                        {k.status === "actief" ? "Actief" : "Inactief"}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase text-muted-foreground">{k.specificatietaal}</TableCell>
                    <TableCell className="capitalize">{k.specificatietype}</TableCell>
                    <TableCell className="tabular-figures">
                      {k.kantoorkosten_actief ? `${k.kantoorkosten_percentage}%` : "—"}
                    </TableCell>
                    <TableCell>{k.valuta}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nog geen klanten aangemaakt.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
