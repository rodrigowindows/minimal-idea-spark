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
      ideas: {
        Row: {
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
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
      nw_projects: {
        Row: {
          created_at: string
          default_target_folder: string | null
          description: string | null
          id: string
          name: string
          sla_max_retries: number
          sla_retry_delay_seconds: number
          sla_timeout_seconds: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_target_folder?: string | null
          description?: string | null
          id?: string
          name: string
          sla_max_retries?: number
          sla_retry_delay_seconds?: number
          sla_timeout_seconds?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_target_folder?: string | null
          description?: string | null
          id?: string
          name?: string
          sla_max_retries?: number
          sla_retry_delay_seconds?: number
          sla_timeout_seconds?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      nw_prompt_events: {
        Row: {
          created_at: string
          id: string
          message: string | null
          prompt_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          prompt_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          prompt_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nw_prompt_events_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "nw_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      nw_prompts: {
        Row: {
          attempts: number | null
          cloned_from: string | null
          content: string
          created_at: string
          error: string | null
          id: string
          name: string
          next_retry_at: string | null
          pipeline_config: Json | null
          pipeline_id: string | null
          pipeline_step: number | null
          pipeline_template_name: string | null
          pipeline_total_steps: number | null
          priority_order: number | null
          processing_started_at: string | null
          project_id: string | null
          provider: string
          queue_stage: string
          result_content: string | null
          result_path: string | null
          status: string
          target_folder: string | null
          template_id: string | null
          template_version: number | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number | null
          cloned_from?: string | null
          content: string
          created_at?: string
          error?: string | null
          id?: string
          name: string
          next_retry_at?: string | null
          pipeline_config?: Json | null
          pipeline_id?: string | null
          pipeline_step?: number | null
          pipeline_template_name?: string | null
          pipeline_total_steps?: number | null
          priority_order?: number | null
          processing_started_at?: string | null
          project_id?: string | null
          provider: string
          queue_stage?: string
          result_content?: string | null
          result_path?: string | null
          status?: string
          target_folder?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number | null
          cloned_from?: string | null
          content?: string
          created_at?: string
          error?: string | null
          id?: string
          name?: string
          next_retry_at?: string | null
          pipeline_config?: Json | null
          pipeline_id?: string | null
          pipeline_step?: number | null
          pipeline_template_name?: string | null
          pipeline_total_steps?: number | null
          priority_order?: number | null
          processing_started_at?: string | null
          project_id?: string | null
          provider?: string
          queue_stage?: string
          result_content?: string | null
          result_path?: string | null
          status?: string
          target_folder?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nw_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nw_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nw_prompts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "nw_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      nw_templates: {
        Row: {
          context_mode: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          steps: Json
          updated_at: string
          version: number
        }
        Insert: {
          context_mode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          steps?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          context_mode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      nw_worker_heartbeats: {
        Row: {
          last_seen: string
          provider: string
          status: string
          worker_id: string
        }
        Insert: {
          last_seen?: string
          provider: string
          status?: string
          worker_id: string
        }
        Update: {
          last_seen?: string
          provider?: string
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
      nw_worker_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          notes: string | null
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          worker_name: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          worker_name?: string
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
      claim_prompts: {
        Args: { p_limit?: number; p_provider: string; p_worker_id: string }
        Returns: {
          attempts: number | null
          cloned_from: string | null
          content: string
          created_at: string
          error: string | null
          id: string
          name: string
          next_retry_at: string | null
          pipeline_config: Json | null
          pipeline_id: string | null
          pipeline_step: number | null
          pipeline_template_name: string | null
          pipeline_total_steps: number | null
          priority_order: number | null
          processing_started_at: string | null
          project_id: string | null
          provider: string
          queue_stage: string
          result_content: string | null
          result_path: string | null
          status: string
          target_folder: string | null
          template_id: string | null
          template_version: number | null
          updated_at: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "nw_prompts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reorder_prioritized_prompts: {
        Args: { p_ids: string[] }
        Returns: number
      }
      reset_stalled_prompts: {
        Args: never
        Returns: {
          attempts: number | null
          cloned_from: string | null
          content: string
          created_at: string
          error: string | null
          id: string
          name: string
          next_retry_at: string | null
          pipeline_config: Json | null
          pipeline_id: string | null
          pipeline_step: number | null
          pipeline_template_name: string | null
          pipeline_total_steps: number | null
          priority_order: number | null
          processing_started_at: string | null
          project_id: string | null
          provider: string
          queue_stage: string
          result_content: string | null
          result_path: string | null
          status: string
          target_folder: string | null
          template_id: string | null
          template_version: number | null
          updated_at: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "nw_prompts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
