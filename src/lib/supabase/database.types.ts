export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auditlog: {
        Row: {
          actie: Database["public"]["Enums"]["audit_actie"]
          created_at: string
          gebruiker_id: string | null
          id: string
          nieuwe_waarde: Json | null
          object_id: string | null
          object_type: string
          oude_waarde: Json | null
          reden: string | null
        }
        Insert: {
          actie: Database["public"]["Enums"]["audit_actie"]
          created_at?: string
          gebruiker_id?: string | null
          id?: string
          nieuwe_waarde?: Json | null
          object_id?: string | null
          object_type: string
          oude_waarde?: Json | null
          reden?: string | null
        }
        Update: {
          actie?: Database["public"]["Enums"]["audit_actie"]
          created_at?: string
          gebruiker_id?: string | null
          id?: string
          nieuwe_waarde?: Json | null
          object_id?: string | null
          object_type?: string
          oude_waarde?: Json | null
          reden?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditlog_gebruiker_id_fkey"
            columns: ["gebruiker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facturatiebatches: {
        Row: {
          accountview_factuurdatum: string | null
          accountview_factuurnummer: string | null
          created_at: string
          goedgekeurd_door: string | null
          goedgekeurd_op: string | null
          id: string
          klant_id: string
          periode_eind: string
          periode_start: string
          project_id: string | null
          status: Database["public"]["Enums"]["batch_status"]
          totaal_bedrag: number
          totaal_externe_kosten: number
          totaal_honorarium: number
          totaal_kantoorkosten: number
          totaal_korting: number
          updated_at: string
          valuta: string
        }
        Insert: {
          accountview_factuurdatum?: string | null
          accountview_factuurnummer?: string | null
          created_at?: string
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          klant_id: string
          periode_eind: string
          periode_start: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          totaal_bedrag?: number
          totaal_externe_kosten?: number
          totaal_honorarium?: number
          totaal_kantoorkosten?: number
          totaal_korting?: number
          updated_at?: string
          valuta?: string
        }
        Update: {
          accountview_factuurdatum?: string | null
          accountview_factuurnummer?: string | null
          created_at?: string
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          klant_id?: string
          periode_eind?: string
          periode_start?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          totaal_bedrag?: number
          totaal_externe_kosten?: number
          totaal_honorarium?: number
          totaal_kantoorkosten?: number
          totaal_korting?: number
          updated_at?: string
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturatiebatches_goedgekeurd_door_fkey"
            columns: ["goedgekeurd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturatiebatches_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturatiebatches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projecten"
            referencedColumns: ["id"]
          },
        ]
      }
      factuuritem_dossiers: {
        Row: {
          created_at: string
          dossiernummer: string
          factuuritem_id: string
          id: string
          land: string | null
          type_dienst: string | null
          volgorde: number
        }
        Insert: {
          created_at?: string
          dossiernummer: string
          factuuritem_id: string
          id?: string
          land?: string | null
          type_dienst?: string | null
          volgorde?: number
        }
        Update: {
          created_at?: string
          dossiernummer?: string
          factuuritem_id?: string
          id?: string
          land?: string | null
          type_dienst?: string | null
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "factuuritem_dossiers_factuuritem_id_fkey"
            columns: ["factuuritem_id"]
            isOneToOne: false
            referencedRelation: "factuuritems"
            referencedColumns: ["id"]
          },
        ]
      }
      factuuritems: {
        Row: {
          created_at: string
          datum: string
          declarabel: boolean
          eenheidstype: string
          externe_kosten: number
          facturatiebatch_id: string | null
          honorarium: number
          id: string
          interne_opmerking: string | null
          kantoorkosten_van_toepassing: boolean
          klant_id: string
          korting: number
          korting_percentage: number | null
          korting_type: Database["public"]["Enums"]["korting_type"]
          laatst_bewerkt_door: string | null
          medewerker_id: string
          omschrijving_klant: string
          prijstype: Database["public"]["Enums"]["prijstype"]
          project_id: string | null
          qty: number
          status: Database["public"]["Enums"]["factuuritem_status"]
          tarief: number | null
          tarief_afwijkend: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          datum: string
          declarabel?: boolean
          eenheidstype?: string
          externe_kosten?: number
          facturatiebatch_id?: string | null
          honorarium?: number
          id?: string
          interne_opmerking?: string | null
          kantoorkosten_van_toepassing?: boolean
          klant_id: string
          korting?: number
          korting_percentage?: number | null
          korting_type?: Database["public"]["Enums"]["korting_type"]
          laatst_bewerkt_door?: string | null
          medewerker_id: string
          omschrijving_klant: string
          prijstype: Database["public"]["Enums"]["prijstype"]
          project_id?: string | null
          qty: number
          status?: Database["public"]["Enums"]["factuuritem_status"]
          tarief?: number | null
          tarief_afwijkend?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          datum?: string
          declarabel?: boolean
          eenheidstype?: string
          externe_kosten?: number
          facturatiebatch_id?: string | null
          honorarium?: number
          id?: string
          interne_opmerking?: string | null
          kantoorkosten_van_toepassing?: boolean
          klant_id?: string
          korting?: number
          korting_percentage?: number | null
          korting_type?: Database["public"]["Enums"]["korting_type"]
          laatst_bewerkt_door?: string | null
          medewerker_id?: string
          omschrijving_klant?: string
          prijstype?: Database["public"]["Enums"]["prijstype"]
          project_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["factuuritem_status"]
          tarief?: number | null
          tarief_afwijkend?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factuuritems_facturatiebatch_id_fkey"
            columns: ["facturatiebatch_id"]
            isOneToOne: false
            referencedRelation: "facturatiebatches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuuritems_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuuritems_laatst_bewerkt_door_fkey"
            columns: ["laatst_bewerkt_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuuritems_medewerker_id_fkey"
            columns: ["medewerker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuuritems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projecten"
            referencedColumns: ["id"]
          },
        ]
      }
      klanten: {
        Row: {
          accountview_debiteurnummer: string | null
          adres: string | null
          contact_email: string | null
          contactpersoon_naam: string | null
          created_at: string
          hubspot_id: string | null
          id: string
          juridische_naam: string | null
          kantoorkosten_actief: boolean
          kantoorkosten_percentage: number
          kolom_externe_kosten_zichtbaar: boolean
          kolom_klantreferentie_zichtbaar: boolean
          kolom_korting_zichtbaar: boolean
          kolom_matter_type_land_zichtbaar: boolean
          kolom_persoon_zichtbaar: boolean
          kolom_tarief_zichtbaar: boolean
          kolom_uren_zichtbaar: boolean
          naam: string
          opmerkingen: string | null
          patricia_id: string | null
          specificatietaal: Database["public"]["Enums"]["specificatietaal"]
          specificatietype: Database["public"]["Enums"]["specificatietype"]
          standaard_teamleider_id: string | null
          status: Database["public"]["Enums"]["klant_status"]
          subtitel: string | null
          updated_at: string
          valuta: string
        }
        Insert: {
          accountview_debiteurnummer?: string | null
          adres?: string | null
          contact_email?: string | null
          contactpersoon_naam?: string | null
          created_at?: string
          hubspot_id?: string | null
          id?: string
          juridische_naam?: string | null
          kantoorkosten_actief?: boolean
          kantoorkosten_percentage?: number
          kolom_externe_kosten_zichtbaar?: boolean
          kolom_klantreferentie_zichtbaar?: boolean
          kolom_korting_zichtbaar?: boolean
          kolom_matter_type_land_zichtbaar?: boolean
          kolom_persoon_zichtbaar?: boolean
          kolom_tarief_zichtbaar?: boolean
          kolom_uren_zichtbaar?: boolean
          naam: string
          opmerkingen?: string | null
          patricia_id?: string | null
          specificatietaal?: Database["public"]["Enums"]["specificatietaal"]
          specificatietype?: Database["public"]["Enums"]["specificatietype"]
          standaard_teamleider_id?: string | null
          status?: Database["public"]["Enums"]["klant_status"]
          subtitel?: string | null
          updated_at?: string
          valuta?: string
        }
        Update: {
          accountview_debiteurnummer?: string | null
          adres?: string | null
          contact_email?: string | null
          contactpersoon_naam?: string | null
          created_at?: string
          hubspot_id?: string | null
          id?: string
          juridische_naam?: string | null
          kantoorkosten_actief?: boolean
          kantoorkosten_percentage?: number
          kolom_externe_kosten_zichtbaar?: boolean
          kolom_klantreferentie_zichtbaar?: boolean
          kolom_korting_zichtbaar?: boolean
          kolom_matter_type_land_zichtbaar?: boolean
          kolom_persoon_zichtbaar?: boolean
          kolom_tarief_zichtbaar?: boolean
          kolom_uren_zichtbaar?: boolean
          naam?: string
          opmerkingen?: string | null
          patricia_id?: string | null
          specificatietaal?: Database["public"]["Enums"]["specificatietaal"]
          specificatietype?: Database["public"]["Enums"]["specificatietype"]
          standaard_teamleider_id?: string | null
          status?: Database["public"]["Enums"]["klant_status"]
          subtitel?: string | null
          updated_at?: string
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "klanten_standaard_teamleider_id_fkey"
            columns: ["standaard_teamleider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patricia_dossiers: {
        Row: {
          actief: boolean
          created_at: string
          dossiernummer: string
          id: string
          klant_id: string
          matter_naam: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          dossiernummer: string
          id?: string
          klant_id: string
          matter_naam: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          dossiernummer?: string
          id?: string
          klant_id?: string
          matter_naam?: string
        }
        Relationships: [
          {
            foreignKeyName: "patricia_dossiers_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
        ]
      }
      productchangelog: {
        Row: {
          bekende_beperkingen: string[]
          bugfixes: string[]
          created_at: string
          gebruikersactie: string | null
          id: string
          nieuwe_functies: string[]
          releasedatum: string
          technische_referenties: string[]
          titel: string
          versienummer: string
          wijzigingen: string[]
          zichtbaarheid: string
        }
        Insert: {
          bekende_beperkingen?: string[]
          bugfixes?: string[]
          created_at?: string
          gebruikersactie?: string | null
          id?: string
          nieuwe_functies?: string[]
          releasedatum: string
          technische_referenties?: string[]
          titel: string
          versienummer: string
          wijzigingen?: string[]
          zichtbaarheid?: string
        }
        Update: {
          bekende_beperkingen?: string[]
          bugfixes?: string[]
          created_at?: string
          gebruikersactie?: string | null
          id?: string
          nieuwe_functies?: string[]
          releasedatum?: string
          technische_referenties?: string[]
          titel?: string
          versienummer?: string
          wijzigingen?: string[]
          zichtbaarheid?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          actief: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          initialen: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          initialen?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          initialen?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projecten: {
        Row: {
          actief: boolean
          created_at: string
          id: string
          klant_id: string
          naam: string
          po_nummer: string | null
          updated_at: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          id?: string
          klant_id: string
          naam: string
          po_nummer?: string | null
          updated_at?: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          id?: string
          klant_id?: string
          naam?: string
          po_nummer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projecten_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
        ]
      }
      specificaties: {
        Row: {
          created_at: string
          created_by: string | null
          facturatiebatch_id: string
          id: string
          pdf_storage_path: string | null
          taal: Database["public"]["Enums"]["specificatietaal"]
          type: Database["public"]["Enums"]["specificatietype"]
          vergrendeld: boolean
          versie: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          facturatiebatch_id: string
          id?: string
          pdf_storage_path?: string | null
          taal: Database["public"]["Enums"]["specificatietaal"]
          type: Database["public"]["Enums"]["specificatietype"]
          vergrendeld?: boolean
          versie?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          facturatiebatch_id?: string
          id?: string
          pdf_storage_path?: string | null
          taal?: Database["public"]["Enums"]["specificatietaal"]
          type?: Database["public"]["Enums"]["specificatietype"]
          vergrendeld?: boolean
          versie?: number
        }
        Relationships: [
          {
            foreignKeyName: "specificaties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specificaties_facturatiebatch_id_fkey"
            columns: ["facturatiebatch_id"]
            isOneToOne: false
            referencedRelation: "facturatiebatches"
            referencedColumns: ["id"]
          },
        ]
      }
      tarieven: {
        Row: {
          created_at: string
          created_by: string | null
          einddatum: string | null
          id: string
          ingangsdatum: string
          klant_id: string | null
          medewerker_id: string | null
          tarief: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          einddatum?: string | null
          id?: string
          ingangsdatum: string
          klant_id?: string | null
          medewerker_id?: string | null
          tarief: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          einddatum?: string | null
          id?: string
          ingangsdatum?: string
          klant_id?: string | null
          medewerker_id?: string | null
          tarief?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarieven_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarieven_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarieven_medewerker_id_fkey"
            columns: ["medewerker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          profile_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teamdoelen: {
        Row: {
          bruto_bedrag: number
          created_at: string
          id: string
          jaar: number
          netto_bedrag: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          bruto_bedrag: number
          created_at?: string
          id?: string
          jaar: number
          netto_bedrag?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          bruto_bedrag?: number
          created_at?: string
          id?: string
          jaar?: number
          netto_bedrag?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamdoelen_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          naam: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          naam: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          naam?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_role: {
        Args: { target: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      resolve_tarief: {
        Args: { p_datum: string; p_klant_id: string; p_medewerker_id: string }
        Returns: number
      }
      shares_team_with: { Args: { target_profile: string }; Returns: boolean }
    }
    Enums: {
      audit_actie:
        | "aanmaken"
        | "wijzigen"
        | "indienen"
        | "goedkeuren"
        | "terugsturen"
        | "exporteren"
        | "vergrendelen"
        | "heropenen"
        | "corrigeren"
      batch_status:
        | "concept"
        | "batch_goedgekeurd"
        | "geexporteerd"
        | "gefactureerd"
      factuuritem_status: "aangemaakt" | "definitief"
      klant_status: "actief" | "inactief"
      korting_type: "bedrag" | "percentage"
      prijstype: "uren" | "vast_honorarium"
      specificatietaal: "nl" | "en"
      specificatietype: "simple" | "extended"
      user_role:
        | "medewerker"
        | "teamleider"
        | "finance"
        | "beheerder"
        | "directie"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_actie: [
        "aanmaken",
        "wijzigen",
        "indienen",
        "goedkeuren",
        "terugsturen",
        "exporteren",
        "vergrendelen",
        "heropenen",
        "corrigeren",
      ],
      batch_status: [
        "concept",
        "batch_goedgekeurd",
        "geexporteerd",
        "gefactureerd",
      ],
      factuuritem_status: ["aangemaakt", "definitief"],
      klant_status: ["actief", "inactief"],
      korting_type: ["bedrag", "percentage"],
      prijstype: ["uren", "vast_honorarium"],
      specificatietaal: ["nl", "en"],
      specificatietype: ["simple", "extended"],
      user_role: [
        "medewerker",
        "teamleider",
        "finance",
        "beheerder",
        "directie",
      ],
    },
  },
} as const

