import fs from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";

// Leest manual.md rechtstreeks — geen aparte kopie om synchroon te houden.
// Nieuwe features horen in dezelfde ronde in manual.md bijgewerkt te worden;
// deze pagina toont dan vanzelf de nieuwste versie.
export default async function HandleidingPage() {
  const inhoud = await fs.readFile(path.join(process.cwd(), "manual.md"), "utf8");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Handleiding</h2>
        <p className="text-sm text-muted-foreground">Hoe Chronos werkt, van inloggen tot de definitieve specificatie.</p>
      </div>

      <Card className="max-w-3xl">
        <CardContent className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{inhoud}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
