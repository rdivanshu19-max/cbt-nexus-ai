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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          sort_order: number
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number
          website_url?: string | null
        }
        Relationships: []
      }
      pdf_conversions: {
        Row: {
          converted_at: string
          id: string
          user_id: string
        }
        Insert: {
          converted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          converted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          has_seen_tutorial: boolean | null
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          has_seen_tutorial?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          has_seen_tutorial?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      saved_notes: {
        Row: {
          chapter: string
          class_level: string
          created_at: string
          exam: string
          finished_card_indices: number[]
          id: string
          notes: Json
          style: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter: string
          class_level: string
          created_at?: string
          exam: string
          finished_card_indices?: number[]
          id?: string
          notes: Json
          style: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter?: string
          class_level?: string
          created_at?: string
          exam?: string
          finished_card_indices?: number[]
          id?: string
          notes?: Json
          style?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      series_promo_codes: {
        Row: {
          code: string
          id: string
          series_id: string
        }
        Insert: {
          code: string
          id?: string
          series_id: string
        }
        Update: {
          code?: string
          id?: string
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_promo_codes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "test_series"
            referencedColumns: ["id"]
          },
        ]
      }
      series_test_sources: {
        Row: {
          external_url: string | null
          storage_path: string | null
          test_id: string
        }
        Insert: {
          external_url?: string | null
          storage_path?: string | null
          test_id: string
        }
        Update: {
          external_url?: string | null
          storage_path?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_test_sources_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: true
            referencedRelation: "series_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      series_tests: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          label: string | null
          lock_mode: string
          question_count: number | null
          series_id: string
          sort_order: number
          syllabus: string | null
          title: string
          total_marks: number | null
          unlock_at: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          label?: string | null
          lock_mode?: string
          question_count?: number | null
          series_id: string
          sort_order?: number
          syllabus?: string | null
          title: string
          total_marks?: number | null
          unlock_at?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          label?: string | null
          lock_mode?: string
          question_count?: number | null
          series_id?: string
          sort_order?: number
          syllabus?: string | null
          title?: string
          total_marks?: number | null
          unlock_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_tests_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "test_series"
            referencedColumns: ["id"]
          },
        ]
      }
      series_unlocks: {
        Row: {
          created_at: string
          series_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          series_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          series_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_unlocks_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "test_series"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          accuracy_percentage: number | null
          completed_at: string | null
          correct_count: number | null
          created_at: string
          id: string
          marked_for_review_count: number | null
          negative_marks: number | null
          positive_marks: number | null
          started_at: string
          status: string
          test_id: string
          time_taken_seconds: number | null
          total_score: number | null
          unattempted_count: number | null
          user_id: string
          wrong_count: number | null
        }
        Insert: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          marked_for_review_count?: number | null
          negative_marks?: number | null
          positive_marks?: number | null
          started_at?: string
          status?: string
          test_id: string
          time_taken_seconds?: number | null
          total_score?: number | null
          unattempted_count?: number | null
          user_id: string
          wrong_count?: number | null
        }
        Update: {
          accuracy_percentage?: number | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          marked_for_review_count?: number | null
          negative_marks?: number | null
          positive_marks?: number | null
          started_at?: string
          status?: string
          test_id?: string
          time_taken_seconds?: number | null
          total_score?: number | null
          unattempted_count?: number | null
          user_id?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
          question_type: string
          subject: string | null
          test_id: string
          topic: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
          question_type?: string
          subject?: string | null
          test_id: string
          topic?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_number?: number
          question_text?: string
          question_type?: string
          subject?: string | null
          test_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_responses: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          is_marked_for_review: boolean | null
          question_id: string
          selected_answer: string | null
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          is_marked_for_review?: boolean | null
          question_id: string
          selected_answer?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          is_marked_for_review?: boolean | null
          question_id?: string
          selected_answer?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_series: {
        Row: {
          accent: string
          coaching_id: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          session_label: string | null
          sort_order: number
          tagline: string | null
          title: string
        }
        Insert: {
          accent?: string
          coaching_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          session_label?: string | null
          sort_order?: number
          tagline?: string | null
          title: string
        }
        Update: {
          accent?: string
          coaching_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          session_label?: string | null
          sort_order?: number
          tagline?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_series_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coaching_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          chapter: string | null
          class_level: string | null
          correct_marks: number
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number
          exam_type: string | null
          id: string
          include_integer: boolean | null
          is_published: boolean | null
          pdf_url: string | null
          subject: string | null
          test_type: string
          title: string
          total_marks: number
          unattempted_marks: number
          updated_at: string
          wrong_marks: number
        }
        Insert: {
          chapter?: string | null
          class_level?: string | null
          correct_marks?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number
          exam_type?: string | null
          id?: string
          include_integer?: boolean | null
          is_published?: boolean | null
          pdf_url?: string | null
          subject?: string | null
          test_type: string
          title: string
          total_marks?: number
          unattempted_marks?: number
          updated_at?: string
          wrong_marks?: number
        }
        Update: {
          chapter?: string | null
          class_level?: string | null
          correct_marks?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number
          exam_type?: string | null
          id?: string
          include_integer?: boolean | null
          is_published?: boolean | null
          pdf_url?: string | null
          subject?: string | null
          test_type?: string
          title?: string
          total_marks?: number
          unattempted_marks?: number
          updated_at?: string
          wrong_marks?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
