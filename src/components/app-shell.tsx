"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { ChronosLogo } from "@/components/chronos-logo";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/actions/auth";
import { ALL_NAV_ITEMS, NAV_ITEMS_BOTTOM, ROLE_LABELS } from "@/lib/nav";
import { suggestInitialen } from "@/lib/initials";
import type { Profile } from "@/lib/supabase/types";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentLabel = ALL_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )?.label;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
        <div className="flex h-16 items-center px-5">
          <ChronosLogo className="text-sidebar-foreground" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks role={profile.role} />
        </div>
        {NAV_ITEMS_BOTTOM.some((item) => item.roles.includes(profile.role)) && (
          <div className="border-t border-sidebar-border px-3 py-2">
            <NavLinks role={profile.role} items={NAV_ITEMS_BOTTOM} />
          </div>
        )}
        <div className="border-t border-sidebar-border px-3 py-3">
          <Badge variant="secondary" className="w-full justify-center bg-sidebar-accent text-sidebar-accent-foreground">
            {ROLE_LABELS[profile.role]}
          </Badge>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          <div className="flex h-16 items-center px-5">
            <ChronosLogo className="text-sidebar-foreground" />
          </div>
          <div className="px-3 py-2">
            <NavLinks role={profile.role} onNavigate={() => setMobileOpen(false)} />
          </div>
          {NAV_ITEMS_BOTTOM.some((item) => item.roles.includes(profile.role)) && (
            <div className="border-t border-sidebar-border px-3 py-2">
              <NavLinks role={profile.role} items={NAV_ITEMS_BOTTOM} onNavigate={() => setMobileOpen(false)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 lg:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigatie"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold tracking-tight">{currentLabel ?? "Chronos"}</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring/50 focus-visible:ring-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {profile.initialen || suggestInitialen(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col gap-0.5 px-1.5 py-1">
                <span className="text-sm font-medium">{profile.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
                Uitloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
