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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          end: string
          id: string
          opportunity_id: string | null
          recurrence: string | null
          reminder_minutes: number | null
          start: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          end: string
          id?: string
          opportunity_id?: string | null
          recurrence?: string | null
          reminder_minutes?: number | null
          start: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          end?: string
          id?: string
          opportunity_id?: string | null
          recurrence?: string | null
          reminder_minutes?: number | null
          start?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          content: string
          created_at: string
          energy_level: number | null
          id: string
          log_date: string
          mood: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          log_date?: string
          mood?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          log_date?: string
          mood?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          cycle: string
          description: string
          domain_id: string | null
          final_score: number | null
          id: string
          key_results: Json
          milestones: Json
          priority_level: string
          progress: number
          start_date: string
          status: string
          target_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle?: string
          description?: string
          domain_id?: string | null
          final_score?: number | null
          id?: string
          key_results?: Json
          milestones?: Json
          priority_level?: string
          progress?: number
          start_date?: string
          status?: string
          target_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle?: string
          description?: string
          domain_id?: string | null
          final_score?: number | null
          id?: string
          key_results?: Json
          milestones?: Json
          priority_level?: string
          progress?: number
          start_date?: string
          status?: string
          target_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          description: string | null
          frequency: string
          id: string
          target_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          description?: string | null
          frequency?: string
          id?: string
          target_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          description?: string | null
          frequency?: string
          id?: string
          target_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content_chunk: string | null
          created_at: string
          id: string
          source_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_chunk?: string | null
          created_at?: string
          id?: string
          source_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_chunk?: string | null
          created_at?: string
          id?: string
          source_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      life_domains: {
        Row: {
          color_theme: string
          created_at: string
          id: string
          name: string
          target_percentage: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color_theme?: string
          created_at?: string
          id?: string
          name: string
          target_percentage?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color_theme?: string
          created_at?: string
          id?: string
          name?: string
          target_percentage?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          archived: boolean
          body: string
          channel: string
          created_at: string
          group_key: string | null
          icon: string | null
          id: string
          metadata: Json | null
          priority: number
          read: boolean
          snoozed_until: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          archived?: boolean
          body?: string
          channel?: string
          created_at?: string
          group_key?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          read?: boolean
          snoozed_until?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          archived?: boolean
          body?: string
          channel?: string
          created_at?: string
          group_key?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          read?: boolean
          snoozed_until?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          description: string | null
          domain_id: string | null
          due_date: string | null
          goal_id: string | null
          id: string
          priority: number
          reminder_at: string | null
          status: string
          strategic_value: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain_id?: string | null
          due_date?: string | null
          goal_id?: string | null
          id?: string
          priority?: number
          reminder_at?: string | null
          status?: string
          strategic_value?: number | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          domain_id?: string | null
          due_date?: string | null
          goal_id?: string | null
          id?: string
          priority?: number
          reminder_at?: string | null
          status?: string
          strategic_value?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          next_week_plan: string
          reflections: string
          score: number
          stats: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_week_plan?: string
          reflections?: string
          score?: number
          stats?: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          next_week_plan?: string
          reflections?: string
          score?: number
          stats?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_targets: {
        Row: {
          created_at: string
          domain_id: string
          hours_target: number
          id: string
          opportunities_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          hours_target?: number
          id?: string
          opportunities_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          hours_target?: number
          id?: string
          opportunities_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_summaries: {
        Row: {
          achievements: Json
          created_at: string
          deep_work_minutes: number
          id: string
          insights_logged: number
          last_activity_date: string | null
          level: number
          opportunities_completed: number
          streak_days: number
          updated_at: string
          user_id: string
          week_score: number | null
          xp_current_level: number
          xp_total: number
        }
        Insert: {
          achievements?: Json
          created_at?: string
          deep_work_minutes?: number
          id?: string
          insights_logged?: number
          last_activity_date?: string | null
          level?: number
          opportunities_completed?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          week_score?: number | null
          xp_current_level?: number
          xp_total?: number
        }
        Update: {
          achievements?: Json
          created_at?: string
          deep_work_minutes?: number
          id?: string
          insights_logged?: number
          last_activity_date?: string | null
          level?: number
          opportunities_completed?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          week_score?: number | null
          xp_current_level?: number
          xp_total?: number
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
