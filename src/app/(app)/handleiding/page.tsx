import {
  Mail,
  LayoutDashboard,
  Receipt,
  Copy,
  FileCheck2,
  History,
  Users,
  AlertTriangle,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChronosMark } from "@/components/chronos-logo";

const FEATURES = [
  {
    icon: Mail,
    titel: "Inloggen zonder wachtwoord",
    tekst: "Eén link per e-mail (magic link). Niets om te onthouden of te resetten.",
  },
  {
    icon: LayoutDashboard,
    titel: "Dashboard",
    tekst: "Omzet, onderhanden werk en voortgang richting target, per periode.",
  },
  {
    icon: Receipt,
    titel: "Factuuritems",
    tekst: "De basisregistratie: werk, gekoppeld aan één of meer dossiers van hetzelfde type.",
  },
  {
    icon: Copy,
    titel: "Kopiëren",
    tekst: "Een bestaand item hergebruiken als startpunt, in plaats van alles opnieuw intypen.",
  },
  {
    icon: FileCheck2,
    titel: "Specificaties",
    tekst: "Factuuritems bundelen, detailniveau kiezen, en vastleggen als definitief.",
  },
  {
    icon: History,
    titel: "Wijzigingenlog",
    tekst: "Elke aanpassing: wat er wijzigde, door wie en wanneer.",
  },
  {
    icon: Users,
    titel: "Klanten-overzicht",
    tekst: "Per klant terugzien wat ooit is gefactureerd, uitgesplitst per dossiertype en land.",
  },
];

const ROLLEN = [
  { rol: "Medewerker", kan: "Eigen factuuritems aanmaken, bewerken, kopiëren", ziet: "Eigen cijfers" },
  { rol: "Teamleider", kan: "Factuuritems van het eigen team; specificaties maken", ziet: "Team-dashboard" },
  { rol: "Finance", kan: "Specificaties maken over alle klanten", ziet: "Financieel overzicht" },
  { rol: "Beheerder", kan: "Alles, plus gebruikers-, team- en instellingenbeheer", ziet: "Alles" },
  { rol: "Directie", kan: "Alleen lezen", ziet: "Praktijkbreed dashboard" },
];

function SectieKop({ label, titel }: { label: string; titel: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-coral">{label}</p>
      <h3 className="text-xl font-semibold tracking-tight">{titel}</h3>
    </div>
  );
}

function StapMockup({ children }: { children: React.ReactNode }) {
  return <Card className="bg-muted/40 shadow-none">{children}</Card>;
}

export default function HandleidingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Handleiding</h2>
        <p className="text-sm text-muted-foreground">Hoe Chronos werkt, van inloggen tot de definitieve specificatie.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <SectieKop label="Doel" titel="Waarom Chronos" />
          <p className="max-w-2xl text-sm text-muted-foreground">
            Chronos is het tijdschrijf- en facturatiesysteem van Knijff: één centrale plek waar je uren, werkzaamheden
            en kosten vastlegt op het juiste dossier, en van waaruit specificaties richting cliënten worden opgesteld.
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Het doel is simpel: minder heen-en-weer tussen systemen, een duidelijk overzicht van wat er per klant
            openstaat, en een controleerbare stap tussen &ldquo;werk vastleggen&rdquo; en &ldquo;declareren&rdquo;.
            Chronos vervangt geen juridisch werk of advies — het is puur de administratieve laag eromheen.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <SectieKop label="Overzicht" titel="Belangrijkste features" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Card key={f.titel}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <div
                  className={
                    i % 2 === 0
                      ? "flex h-9 w-9 items-center justify-center rounded-lg bg-cool/15 text-cool"
                      : "flex h-9 w-9 items-center justify-center rounded-lg bg-coral/15 text-coral"
                  }
                >
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-semibold">{f.titel}</p>
                <p className="text-xs text-muted-foreground">{f.tekst}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <SectieKop label="Toegang" titel="Rollen in Chronos" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Kan</TableHead>
                <TableHead>Ziet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLLEN.map((r) => (
                <TableRow key={r.rol}>
                  <TableCell className="font-medium">{r.rol}</TableCell>
                  <TableCell className="text-muted-foreground">{r.kan}</TableCell>
                  <TableCell className="text-muted-foreground">{r.ziet}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Een beheerder kan via <strong>Instellingen → Gebruikers → &ldquo;Inloggen als&rdquo;</strong> tijdelijk een
            andere rol bekijken.
          </p>
        </CardContent>
      </Card>

      {/* Stap 1: Inloggen */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 1" titel="Inloggen" />
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>1. Ga naar de Chronos-omgeving.</li>
            <li>
              2. Vul je e-mailadres in en klik op <strong className="text-foreground">&ldquo;Stuur inloglink&rdquo;</strong>.
            </li>
            <li>3. Je ontvangt binnen enkele seconden een e-mail met een inloglink — geen wachtwoord nodig.</li>
            <li>4. Je komt automatisch op het Dashboard terecht.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            <em>Geen mail ontvangen?</em> Check je spamfilter, en controleer of het juiste e-mailadres is gebruikt.
          </p>
        </div>
        <StapMockup>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <div className="flex items-center gap-1.5 font-semibold">
              <ChronosMark className="h-5 w-5 text-primary" />
              Chronos
            </div>
            <p className="text-xs text-muted-foreground">Tijdschrijf- en facturatiesysteem</p>
            <div className="flex w-full flex-col gap-1.5 text-left">
              <Label className="text-xs">E-mailadres</Label>
              <Input placeholder="naam@knijff.com" disabled className="bg-background text-xs" />
            </div>
            <Button className="w-full" disabled>
              Stuur inloglink
            </Button>
          </CardContent>
        </StapMockup>
      </div>

      {/* Stap 2: Dashboard */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 2" titel="Het dashboard" />
          <p className="text-sm text-muted-foreground">Toont, afhankelijk van je rol:</p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>— gefactureerde omzet en onderhanden werk voor de gekozen periode,</li>
            <li>— voortgang t.o.v. het jaartarget,</li>
            <li>— omzet per teamlid, klant, productgroep en land.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Gebruik de periode-selector rechtsboven om te wisselen tussen maand, kwartaal of jaar. Dit scherm is puur
            informatief — je registreert hier niets.
          </p>
        </div>
        <StapMockup>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="rounded-xl bg-primary p-4 text-primary-foreground">
              <p className="text-[0.65rem] uppercase tracking-wide text-primary-foreground/60">
                Gefactureerd · Dit jaar (YTD)
              </p>
              <p className="text-lg font-bold">€ 3.010,00</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2.5">
                <p className="text-[0.6rem] uppercase text-muted-foreground">Onderhanden werk</p>
                <p className="text-sm font-semibold">€ 1.240,00</p>
              </div>
              <div className="rounded-lg border border-border p-2.5">
                <p className="text-[0.6rem] uppercase text-muted-foreground">Target MTD</p>
                <p className="text-sm font-semibold text-warning">0%</p>
              </div>
            </div>
          </CardContent>
        </StapMockup>
      </div>

      {/* Stap 3: Nieuw factuuritem */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 3" titel="Een nieuw factuuritem aanmaken" />
          <p className="text-sm text-muted-foreground">Dit is de kern van dagelijks gebruik.</p>
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>1. Klik op &ldquo;Nieuw factuuritem&rdquo;.</li>
            <li>
              2. <strong className="text-foreground">Dossier(s)</strong>: typ het dossiernummer, Enter. Meerdere
              dossiers mag, mits hetzelfde type (bv. twee Merken-dossiers) — een Merken- en een Oppositie-dossier
              combineren kan niet, en Chronos meldt dat direct. Land mag wel verschillen.
            </li>
            <li>3. Vul per dossier de dossiernaam in, kies klant en eventueel project.</li>
            <li>4. Vul de omschrijving voor de klant in — komt op de specificatie. Een interne opmerking niet.</li>
            <li>5. Kies prijstype (Uren of Fixed fee); Chronos stelt een tarief voor.</li>
            <li>6. Vul eventueel kosten van derden en/of korting in, en klik op &ldquo;Factuuritem aanmaken&rdquo;.</li>
          </ol>
        </div>
        <StapMockup>
          <CardContent className="flex flex-col gap-2 pt-6">
            <Label className="text-xs">Dossier(s)</Label>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">O26921PL00</Badge>
              <Badge variant="outline">O26922PL00</Badge>
            </div>
            <Input value="TM14526PL00" disabled className="border-warning bg-background text-xs" />
            <div className="flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Merken kan niet samen met Opposities op één factuuritem — combineer alleen dossiers van hetzelfde
                type.
              </span>
            </div>
          </CardContent>
        </StapMockup>
      </div>

      {/* Stap 4: Beheren */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 4" titel="Factuuritems bekijken, bewerken, kopiëren" />
          <p className="text-sm text-muted-foreground">
            Via <strong className="text-foreground">Factuuritems</strong> zie je alle klanten met openstaand werk.
            Achter elke regel staat een menu (⋮) met drie acties:
          </p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Bewerken</strong> — alleen zolang een item nog niet gefactureerd
              is. Elke wijziging komt in het wijzigingenlog te staan.
            </li>
            <li>
              <strong className="text-foreground">Kopiëren</strong> — een nieuw factuuritem, vooringevuld met alle
              gegevens van het origineel, behalve datum (staat op vandaag) en medewerker/team (wordt jouw account).
              Werkt ook op al gefactureerde regels.
            </li>
            <li>
              <strong className="text-foreground">Verwijderen</strong> — alleen zolang nog niet gefactureerd; vraagt
              eerst om bevestiging.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Een oranje bolletje met uitroepteken achter een dossiernummer betekent: er staat een interne opmerking op
            die regel — hover erover om te lezen.
          </p>
        </div>
        <StapMockup>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-1.5 font-medium">
                    O26921PL00
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-[0.55rem] font-bold text-white">
                      !
                    </span>
                  </TableCell>
                  <TableCell>€ 1.240,00</TableCell>
                  <TableCell className="text-right">
                    <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-md border border-border">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-2 ml-auto w-32 rounded-md border border-border bg-popover p-1 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 rounded px-1.5 py-1">
                <Pencil className="h-3.5 w-3.5" /> Bewerken
              </div>
              <div className="flex items-center gap-1.5 rounded px-1.5 py-1">
                <Copy className="h-3.5 w-3.5" /> Kopiëren
              </div>
              <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-warning">
                <Trash2 className="h-3.5 w-3.5" /> Verwijderen
              </div>
            </div>
          </CardContent>
        </StapMockup>
      </div>

      {/* Stap 5: Specificatie */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 5" titel="Een specificatie maken" />
          <p className="text-xs font-medium text-muted-foreground">Finance, Teamleider, Beheerder</p>
          <p className="text-sm text-muted-foreground">
            Een specificatie bundelt één of meer factuuritems van dezelfde klant tot één geheel.
          </p>
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>1. Vink de gewenste factuuritems aan en klik &ldquo;Specificatie maken&rdquo;.</li>
            <li>2. Vul eventueel een extra korting op de hele specificatie in.</li>
            <li>
              3. Kies het <strong className="text-foreground">detailniveau</strong>: standaard alleen datum, dossier,
              omschrijving, aantal en totaal. Vink &ldquo;Kosten van derden&rdquo; en/of &ldquo;Korting als aparte
              kolom tonen&rdquo; aan voor de volledige uitsplitsing.
            </li>
            <li>4. Controleer het live voorbeeld, en download eventueel een concept (PDF) — nog niets vastgelegd.</li>
            <li>
              5. Tevreden? Klik &ldquo;Bevestigen en specificatie maken&rdquo;. Hierna staat de specificatie vast —
              het factureren zelf gebeurt handmatig, buiten Chronos om.
            </li>
          </ol>
        </div>
        <StapMockup>
          <CardContent className="flex flex-col gap-3 pt-6">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked disabled /> Kosten van derden als aparte kolom tonen
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox disabled /> Korting als aparte kolom tonen
            </label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Omschrijving</TableHead>
                  <TableHead className="text-xs">Qty</TableHead>
                  <TableHead className="text-xs">Fee</TableHead>
                  <TableHead className="text-xs">Ext.</TableHead>
                  <TableHead className="text-xs">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="text-xs">
                  <TableCell>Registratie label</TableCell>
                  <TableCell>1,5</TableCell>
                  <TableCell>€190</TableCell>
                  <TableCell>€45</TableCell>
                  <TableCell>€330</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </StapMockup>
      </div>

      {/* Stap 6: Klantenoverzicht */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <SectieKop label="Stap 6" titel="Klantenoverzicht" />
          <p className="text-xs font-medium text-muted-foreground">Teamleider, Finance, Beheerder, Directie</p>
          <p className="text-sm text-muted-foreground">
            Via <strong className="text-foreground">Klanten</strong> zie je, per klant, hoeveel er ooit is
            gefactureerd — alleen definitieve factuuritems tellen mee, nog openstaand werk staat hier niet bij.
          </p>
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>1. De lijst toont per klant het totaal, aantal items en aantal specificaties.</li>
            <li>2. De klantpagina toont het totaal, plus een uitsplitsing per dossiertype en per land.</li>
            <li>3. Daaronder: de volledige lijst van definitieve factuuritems (alleen-lezen).</li>
            <li>4. Onderaan: alle specificaties, elk met een knop om de PDF opnieuw te downloaden.</li>
          </ol>
        </div>
        <StapMockup>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div>
              <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Totaal gefactureerd</p>
              <p className="text-lg font-bold">€ 2.750,00</p>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  <Badge variant="outline" className="mr-1 text-[0.6rem]">
                    TM
                  </Badge>
                  Merken
                </span>
                <span className="font-medium">€ 1.850,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  <Badge variant="outline" className="mr-1 text-[0.6rem]">
                    O
                  </Badge>
                  Opposities
                </span>
                <span className="font-medium">€ 900,00</span>
              </div>
            </div>
          </CardContent>
        </StapMockup>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-6">
          <SectieKop label="Tot slot" titel="Feedback geven" />
          <p className="text-sm text-muted-foreground">
            Loop je tegen iets vreemds aan, mis je iets, of is iets niet duidelijk? Meld dit bij je
            testcoördinator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
