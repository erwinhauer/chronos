import type { Database } from "./database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type FactuurItemStatus = Database["public"]["Enums"]["factuuritem_status"];
export type PrijsType = Database["public"]["Enums"]["prijstype"];
export type KortingType = Database["public"]["Enums"]["korting_type"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Klant = Database["public"]["Tables"]["klanten"]["Row"];
export type FactuurItem = Database["public"]["Tables"]["factuuritems"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
export type PatriciaDossier = Database["public"]["Tables"]["patricia_dossiers"]["Row"];
export type ProfileRole = Database["public"]["Tables"]["profile_roles"]["Row"];

export type { Database };
