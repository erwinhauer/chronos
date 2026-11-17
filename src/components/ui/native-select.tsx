import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Gewone <select> in de stijl van de andere invoervelden. Werkt zonder JavaScript-state in een
// <form action={...}>, omdat de waarde gewoon als formulierveld meegaat.
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-10 w-full appearance-none rounded-full border border-input bg-transparent px-4 py-1.5 pr-9 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
