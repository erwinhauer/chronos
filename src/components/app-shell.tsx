"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, ChevronRight } from "lucide-react";
import { ChronosLogo } from "@/components/chronos-logo";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/actions/auth";
import { wisselActieveRol } from "@/actions/profiel";
import { ALL_NAV_ITEMS, NAV_ITEMS_BOTTOM, ROLE_LABELS } from "@/lib/nav";
import { suggestInitialen } from "@/lib/initials";
import { BreadcrumbProvider, useBreadcrumbSegments } from "@/lib/breadcrumb-context";
import type { Profile, UserRole } from "@/lib/supabase/types";

export function AppShell({
  profile,
  toegekendeRollen,
  children,
}: {
  profile: Profile;
  toegekendeRollen: UserRole[];
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbProvider>
      <AppShellContent profile={profile} toegekendeRollen={toegekendeRollen}>
        {children}
      </AppShellContent>
    </BreadcrumbProvider>
  );
}

function RolWisselaar({ profile, toegekendeRollen }: { profile: Profile; toegekendeRollen: UserRole[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (toegekendeRollen.length <= 1) {
    return (
      <Badge variant="secondary" className="w-full justify-center bg-sidebar-accent text-sidebar-accent-foreground">
        {ROLE_LABELS[profile.role]}
      </Badge>
    );
  }

  return (
    <select
      value={profile.role}
      disabled={pending}
      onChange={(e) => {
        const target = e.target.value as UserRole;
        startTransition(async () => {
          await wisselActieveRol(target);
          router.refresh();
        });
      }}
      className="h-8 w-full appearance-none rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 text-sm text-sidebar-accent-foreground outline-none"
    >
      {toegekendeRollen.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

function HeaderTitle({ fallback }: { fallback: string }) {
  const { segments } = useBreadcrumbSegments();

  if (!segments || segments.length === 0) {
    return <h1 className="text-base font-semibold tracking-tight">{fallback}</h1>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            {segment.href && !isLast ? (
              <Link href={segment.href} className="text-muted-foreground hover:text-foreground hover:underline">
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? "" : "text-muted-foreground"}>{segment.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function AppShellContent({
  profile,
  toegekendeRollen,
  children,
}: {
  profile: Profile;
  toegekendeRollen: UserRole[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentLabel = ALL_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )?.label;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
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
          <RolWisselaar profile={profile} toegekendeRollen={toegekendeRollen} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          <div className="flex h-16 shrink-0 items-center px-5">
            <ChronosLogo className="text-sidebar-foreground" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
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
            <HeaderTitle fallback={currentLabel ?? "Chronos"} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring/50 focus-visible:ring-2">
              <Avatar className="h-8 w-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
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
              <DropdownMenuItem render={<Link href="/profiel" />}>Profiel</DropdownMenuItem>
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
