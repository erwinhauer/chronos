import {
  Tag,
  Shapes,
  Swords,
  ShieldAlert,
  FileSignature,
  Globe,
  FileText,
  RefreshCw,
  Eye,
  Ban,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { tagKleurStijl } from "@/lib/tag-kleur";
import { cn } from "@/lib/utils";

// Eén icoon per dienst-type (zie TYPE_PREFIXES in src/lib/dossiernummer.ts).
const ICONEN: Record<string, LucideIcon> = {
  Cancellations: Ban,
  Merken: Tag,
  Modellen: Shapes,
  Opposities: Swords,
  Inbreuken: ShieldAlert,
  Overeenkomsten: FileSignature,
  Domeinnamen: Globe,
  Algemeen: FileText,
  Mutaties: RefreshCw,
  Bewaking: Eye,
};

export function DienstIcon({ dienst, className }: { dienst: string; className?: string }) {
  const Icon = ICONEN[dienst] ?? HelpCircle;
  return (
    <div
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}
      style={tagKleurStijl(dienst)}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}
