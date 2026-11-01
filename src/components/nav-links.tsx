"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import type { UserRole } from "@/lib/supabase/types";

export function NavLinks({
  role,
  onNavigate,
  items: itemsOverride,
}: {
  role: UserRole;
  onNavigate?: () => void;
  items?: NavItem[];
}) {
  const pathname = usePathname();
  const items = (itemsOverride ?? NAV_ITEMS).filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-3 text-[15px] transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active ? "text-coral" : "opacity-75")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
