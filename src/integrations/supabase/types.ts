export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      auction_log: {
        Row: {
          action: string
          created_at: string
          id: string
          player_id: string | null
          player_name: string
          sold_price: number | null
          team_id: string | null
          team_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          player_id?: string | null
          player_name: string
          sold_price?: number | null
          team_id?: string | null
          team_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          player_id?: string | null
          player_name?: string
          sold_price?: number | null
          team_id?: string | null
          team_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "auction_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_players: {
        Row: {
          age: number | null
          base_price: number
          batting_style: string | null
          bowling_style: string | null
          country: string | null
          created_at: string
          current_bid: number | null
          id: string
          image_url: string | null
          ipl_caps: number | null
          is_capped: boolean | null
          leading_team_id: string | null
          player_name: string
          role: string | null
          set_name: string | null
          set_number: number | null
          sold_price: number | null
          sold_to_team: string | null
          status: string
        }
        Insert: {
          age?: number | null
          base_price?: number
          batting_style?: string | null
          bowling_style?: string | null
          country?: string | null
          created_at?: string
          current_bid?: number | null
          id?: string
          image_url?: string | null
          ipl_caps?: number | null
          is_capped?: boolean | null
          leading_team_id?: string | null
          player_name: string
          role?: string | null
          set_name?: string | null
          set_number?: number | null
          sold_price?: number | null
          sold_to_team?: string | null
          status?: string
        }
        Update: {
          age?: number | null
          base_price?: number
          batting_style?: string | null
          bowling_style?: string | null
          country?: string | null
          created_at?: string
          current_bid?: number | null
          id?: string
          image_url?: string | null
          ipl_caps?: number | null
          is_capped?: boolean | null
          leading_team_id?: string | null
          player_name?: string
          role?: string | null
          set_name?: string | null
          set_number?: number | null
          sold_price?: number | null
          sold_to_team?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_players_sold_to_team_fkey"
            columns: ["sold_to_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      retained_players: {
        Row: {
          id: string
          nationality: string | null
          player_name: string
          retention_price: number | null
          role: string | null
          team_id: string
        }
        Insert: {
          id?: string
          nationality?: string | null
          player_name: string
          retention_price?: number | null
          role?: string | null
          team_id: string
        }
        Update: {
          id?: string
          nationality?: string | null
          player_name?: string
          retention_price?: number | null
          role?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retained_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          overseas_slots: number
          owner_name: string | null
          player_slots: number
          short_name: string
          spent_budget: number
          total_budget: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          overseas_slots?: number
          owner_name?: string | null
          player_slots?: number
          short_name: string
          spent_budget?: number
          total_budget?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          overseas_slots?: number
          owner_name?: string | null
          player_slots?: number
          short_name?: string
          spent_budget?: number
          total_budget?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
