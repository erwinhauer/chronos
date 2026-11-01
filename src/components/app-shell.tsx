"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, ChevronRight, UserRoundCog } from "lucide-react";
import { ChronosMark } from "@/components/chronos-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/actions/auth";
import { wisselActieveRol } from "@/actions/profiel";
import { ALL_NAV_ITEMS, NAV_ITEMS_BOTTOM, ROLE_LABELS } from "@/lib/nav";
import { suggestInitialen } from "@/lib/initials";
import { BreadcrumbProvider, useBreadcrumbSegments } from "@/lib/breadcrumb-context";
import type { Profile, UserRole } from "@/lib/supabase/types";

export function AppShell({
  profile,
  toegekendeRollen,
  impersonatieDoor,
  versienummer,
  children,
}: {
  profile: Profile;
  toegekendeRollen: UserRole[];
  impersonatieDoor?: string | null;
  versienummer?: string | null;
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbProvider>
      <AppShellContent
        profile={profile}
        toegekendeRollen={toegekendeRollen}
        impersonatieDoor={impersonatieDoor}
        versienummer={versienummer}
      >
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
      <span className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[profile.role]}</span>
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
      className="h-7 w-full appearance-none rounded-full border border-sidebar-border bg-sidebar-accent px-3 text-xs text-sidebar-accent-foreground outline-none"
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
    return <h1 className="text-xl font-light tracking-tight">{fallback}</h1>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xl font-light tracking-tight">
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

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua text-aqua-ink">
        <ChronosMark className="h-6 w-6" />
      </span>
      <div className="leading-tight">
        <span className="block text-[22px] font-medium tracking-tight">Chronos</span>
        <span className="block text-[11px] tracking-[0.12em] text-sidebar-foreground/60">KNIJFF</span>
      </div>
    </div>
  );
}

function SidebarGebruiker({ profile, toegekendeRollen }: { profile: Profile; toegekendeRollen: UserRole[] }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <Avatar className="h-11 w-11">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
        <AvatarFallback className="bg-aqua text-sm font-medium text-aqua-ink">
          {profile.initialen || suggestInitialen(profile.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-tight">{profile.full_name}</p>
        <RolWisselaar profile={profile} toegekendeRollen={toegekendeRollen} />
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        aria-label="Uitloggen"
        title="Uitloggen"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

function AppShellContent({
  profile,
  toegekendeRollen,
  impersonatieDoor,
  versienummer,
  children,
}: {
  profile: Profile;
  toegekendeRollen: UserRole[];
  impersonatieDoor?: string | null;
  versienummer?: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentLabel = ALL_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )?.label;

  return (
    <div className="flex min-h-screen flex-col">
      {impersonatieDoor && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-center text-xs font-medium text-warning print:hidden">
          <UserRoundCog className="h-3.5 w-3.5" />
          Je bekijkt Chronos als {profile.full_name} — ingelogd door {impersonatieDoor} (testfase). Uitloggen en
          opnieuw inloggen om terug te gaan naar je eigen account.
        </div>
      )}
      <div className="flex min-h-0 flex-1">
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col rounded-r-[36px] bg-sidebar px-5 pt-8 pb-5 text-sidebar-foreground lg:flex print:hidden">
        <SidebarBrand />
        <div className="mt-10 flex-1 overflow-y-auto">
          <NavLinks role={profile.role} />
        </div>
        {NAV_ITEMS_BOTTOM.some((item) => item.roles.includes(profile.role)) && (
          <div className="border-t border-sidebar-border pt-3">
            <NavLinks role={profile.role} items={NAV_ITEMS_BOTTOM} />
          </div>
        )}
        <div className="mt-3 border-t border-sidebar-border pt-4">
          <SidebarGebruiker profile={profile} toegekendeRollen={toegekendeRollen} />
        </div>
        {versienummer && (
          <div className="pt-3 text-center text-[11px] text-sidebar-foreground/40">Chronos v{versienummer}</div>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col rounded-r-[36px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          <div className="shrink-0 px-4 pt-8">
            <SidebarBrand />
          </div>
          <div className="mt-6 flex-1 overflow-y-auto px-3 py-2">
            <NavLinks role={profile.role} onNavigate={() => setMobileOpen(false)} />
          </div>
          {NAV_ITEMS_BOTTOM.some((item) => item.roles.includes(profile.role)) && (
            <div className="border-t border-sidebar-border px-3 py-2">
              <NavLinks role={profile.role} items={NAV_ITEMS_BOTTOM} onNavigate={() => setMobileOpen(false)} />
            </div>
          )}
          <div className="border-t border-sidebar-border px-3 py-4">
            <SidebarGebruiker profile={profile} toegekendeRollen={toegekendeRollen} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between bg-mist px-4 lg:px-9 print:hidden">
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
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-9 print:overflow-visible print:p-0">{children}</main>
      </div>
      </div>
    </div>
  );
}
