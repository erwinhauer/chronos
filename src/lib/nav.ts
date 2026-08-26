import type { UserRole } from "@/lib/supabase/types";
import { LayoutDashboard, Receipt, Settings, CircleUser } from "lucide-react";

const ALLE_ROLLEN: UserRole[] = ["medewerker", "teamleider", "finance", "beheerder", "directie"];

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALLE_ROLLEN,
  },
  {
    label: "Factuuritems",
    href: "/factuuritems",
    icon: Receipt,
    roles: ["medewerker", "teamleider", "finance", "beheerder"],
  },
];

export const NAV_ITEMS_BOTTOM: NavItem[] = [
  {
    label: "Profiel",
    href: "/profiel",
    icon: CircleUser,
    roles: ALLE_ROLLEN,
  },
  {
    label: "Instellingen",
    href: "/instellingen",
    icon: Settings,
    roles: ["beheerder"],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...NAV_ITEMS_BOTTOM];

export const ROLE_LABELS: Record<UserRole, string> = {
  medewerker: "Medewerker",
  teamleider: "Teamleider",
  finance: "Finance",
  beheerder: "Beheerder",
  directie: "Directie",
};
