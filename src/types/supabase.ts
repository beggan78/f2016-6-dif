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
      club: {
        Row: {
          created_at: string
          id: string
          long_name: string | null
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          long_name?: string | null
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          long_name?: string | null
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      match: {
        Row: {
          captain: string | null
          created_at: string
          fair_play_award: string | null
          finished_at: string | null
          format: Database["public"]["Enums"]["match_format"]
          formation: string
          goals_conceded: number | null
          goals_scored: number | null
          id: string
          match_duration_seconds: number
          opponent: string | null
          outcome: Database["public"]["Enums"]["match_outcome"] | null
          period_duration_minutes: number
          periods: number
          started_at: string | null
          state: Database["public"]["Enums"]["match_state"]
          team_id: string
          type: Database["public"]["Enums"]["match_type"]
          updated_at: string
          venue_type: Database["public"]["Enums"]["match_venue_type"]
        }
        Insert: {
          captain?: string | null
          created_at?: string
          fair_play_award?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["match_format"]
          formation?: string
          goals_conceded?: number | null
          goals_scored?: number | null
          id?: string
          match_duration_seconds?: number
          opponent?: string | null
          outcome?: Database["public"]["Enums"]["match_outcome"] | null
          period_duration_minutes?: number
          periods?: number
          started_at?: string | null
          state?: Database["public"]["Enums"]["match_state"]
          team_id: string
          type?: Database["public"]["Enums"]["match_type"]
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["match_venue_type"]
        }
        Update: {
          captain?: string | null
          created_at?: string
          fair_play_award?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["match_format"]
          formation?: string
          goals_conceded?: number | null
          goals_scored?: number | null
          id?: string
          match_duration_seconds?: number
          opponent?: string | null
          outcome?: Database["public"]["Enums"]["match_outcome"] | null
          period_duration_minutes?: number
          periods?: number
          started_at?: string | null
          state?: Database["public"]["Enums"]["match_state"]
          team_id?: string
          type?: Database["public"]["Enums"]["match_type"]
          updated_at?: string
          venue_type?: Database["public"]["Enums"]["match_venue_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_captain_fkey"
            columns: ["captain"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_fair_play_award_fkey"
            columns: ["fair_play_award"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      match_log_event: {
        Row: {
          correlation_id: string | null
          created_at: string
          data: Json | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          id: string
          match_id: string
          occurred_at_seconds: number
          period: number
          player_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          data?: Json | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          id?: string
          match_id: string
          occurred_at_seconds: number
          period: number
          player_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          data?: Json | null
          event_type?: Database["public"]["Enums"]["match_event_type"]
          id?: string
          match_id?: string
          occurred_at_seconds?: number
          period?: number
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_log_event_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_log_event_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player: {
        Row: {
          created_at: string
          id: string
          jersey_number: string | null
          name: string
          on_roster: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          name: string
          on_roster?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          name?: string
          on_roster?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stats: {
        Row: {
          attacker_time_seconds: number | null
          created_at: string | null
          defender_time_seconds: number | null
          goalie_time_seconds: number | null
          goals_scored: number | null
          got_fair_play_award: boolean | null
          id: string
          match_id: string
          midfielder_time_seconds: number | null
          player_id: string
          started_as: Database["public"]["Enums"]["player_role"]
          substitute_time_seconds: number | null
          substitutions_in: number | null
          substitutions_out: number | null
          team_mode: string
          total_field_time_seconds: number | null
          updated_at: string | null
          was_captain: boolean | null
        }
        Insert: {
          attacker_time_seconds?: number | null
          created_at?: string | null
          defender_time_seconds?: number | null
          goalie_time_seconds?: number | null
          goals_scored?: number | null
          got_fair_play_award?: boolean | null
          id?: string
          match_id: string
          midfielder_time_seconds?: number | null
          player_id: string
          started_as: Database["public"]["Enums"]["player_role"]
          substitute_time_seconds?: number | null
          substitutions_in?: number | null
          substitutions_out?: number | null
          team_mode: string
          total_field_time_seconds?: number | null
          updated_at?: string | null
          was_captain?: boolean | null
        }
        Update: {
          attacker_time_seconds?: number | null
          created_at?: string | null
          defender_time_seconds?: number | null
          goalie_time_seconds?: number | null
          goals_scored?: number | null
          got_fair_play_award?: boolean | null
          id?: string
          match_id?: string
          midfielder_time_seconds?: number | null
          player_id?: string
          started_as?: Database["public"]["Enums"]["player_role"]
          substitute_time_seconds?: number | null
          substitutions_in?: number | null
          substitutions_out?: number | null
          team_mode?: string
          total_field_time_seconds?: number | null
          updated_at?: string | null
          was_captain?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      season_stats: {
        Row: {
          captain_count: number | null
          created_at: string | null
          fair_play_awards: number | null
          goals_scored: number | null
          id: string
          matches_played: number | null
          player_id: string
          season_year: number
          starts_as_field_player: number | null
          starts_as_goalie: number | null
          starts_as_substitute: number | null
          total_attacker_time_seconds: number | null
          total_defender_time_seconds: number | null
          total_field_time_seconds: number | null
          total_goalie_time_seconds: number | null
          total_midfielder_time_seconds: number | null
          total_substitute_time_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          captain_count?: number | null
          created_at?: string | null
          fair_play_awards?: number | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          player_id: string
          season_year: number
          starts_as_field_player?: number | null
          starts_as_goalie?: number | null
          starts_as_substitute?: number | null
          total_attacker_time_seconds?: number | null
          total_defender_time_seconds?: number | null
          total_field_time_seconds?: number | null
          total_goalie_time_seconds?: number | null
          total_midfielder_time_seconds?: number | null
          total_substitute_time_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          captain_count?: number | null
          created_at?: string | null
          fair_play_awards?: number | null
          goals_scored?: number | null
          id?: string
          matches_played?: number | null
          player_id?: string
          season_year?: number
          starts_as_field_player?: number | null
          starts_as_goalie?: number | null
          starts_as_substitute?: number | null
          total_attacker_time_seconds?: number | null
          total_defender_time_seconds?: number | null
          total_field_time_seconds?: number | null
          total_goalie_time_seconds?: number | null
          total_midfielder_time_seconds?: number | null
          total_substitute_time_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          is_global: boolean
          key: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_global?: boolean
          key: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_global?: boolean
          key?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          active: boolean
          club_id: string | null
          configuration: Json
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          club_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          club_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "club"
            referencedColumns: ["id"]
          },
        ]
      }
      team_user: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_user_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_user_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
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
      match_event_type:
        | "goal_scored"
        | "goal_conceded"
        | "substitution_in"
        | "substitution_out"
        | "match_started"
        | "match_ended"
        | "period_started"
        | "period_ended"
        | "goalie_enters"
        | "goalie_exits"
        | "position_switch"
        | "sub_order_changed"
        | "player_inactivated"
        | "player_reactivated"
      match_format: "3v3" | "5v5" | "7v7" | "9v9" | "11v11"
      match_outcome: "win" | "loss" | "draw"
      match_state: "running" | "finished" | "pending" | "confirmed"
      match_type: "friendly" | "internal" | "league" | "tournament" | "cup"
      match_venue_type: "home" | "away" | "neutral"
      player_role:
        | "goalie"
        | "defender"
        | "midfielder"
        | "attacker"
        | "substitute"
      user_role: "parent" | "player" | "coach" | "admin"
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
      match_event_type: [
        "goal_scored",
        "goal_conceded",
        "substitution_in",
        "substitution_out",
        "match_started",
        "match_ended",
        "period_started",
        "period_ended",
        "goalie_enters",
        "goalie_exits",
        "position_switch",
        "sub_order_changed",
        "player_inactivated",
        "player_reactivated",
      ],
      match_format: ["3v3", "5v5", "7v7", "9v9", "11v11"],
      match_outcome: ["win", "loss", "draw"],
      match_state: ["running", "finished", "pending", "confirmed"],
      match_type: ["friendly", "internal", "league", "tournament", "cup"],
      player_role: [
        "goalie",
        "defender",
        "midfielder",
        "attacker",
        "substitute",
      ],
      user_role: ["parent", "player", "coach", "admin"],
    },
  },
} as const
