import type { UserRole } from "@/lib/supabase/types";
import { LayoutDashboard, Users, Receipt, Settings } from "lucide-react";

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
    roles: ["medewerker", "teamleider", "finance", "beheerder"],
  },
  {
    label: "Factuuritems",
    href: "/factuuritems",
    icon: Receipt,
    roles: ["medewerker", "teamleider", "finance", "beheerder"],
  },
  {
    label: "Klanten",
    href: "/klanten",
    icon: Users,
    roles: ["medewerker", "teamleider", "finance", "beheerder"],
  },
];

export const NAV_ITEMS_BOTTOM: NavItem[] = [
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
};
