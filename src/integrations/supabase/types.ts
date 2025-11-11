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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversation_analysis: {
        Row: {
          ai_recommendations: string | null
          analysis_date: string
          confidence_score: number | null
          created_at: string
          grammar_issues: Json
          id: string
          practice_suggestions: Json
          recording_id: string
          shared_with_teacher: boolean | null
          struggle_areas: Json
          student_id: string
          teacher_report: string | null
          topics_discussed: Json
          updated_at: string
          vocabulary_gaps: Json
        }
        Insert: {
          ai_recommendations?: string | null
          analysis_date: string
          confidence_score?: number | null
          created_at?: string
          grammar_issues?: Json
          id?: string
          practice_suggestions?: Json
          recording_id: string
          shared_with_teacher?: boolean | null
          struggle_areas?: Json
          student_id: string
          teacher_report?: string | null
          topics_discussed?: Json
          updated_at?: string
          vocabulary_gaps?: Json
        }
        Update: {
          ai_recommendations?: string | null
          analysis_date?: string
          confidence_score?: number | null
          created_at?: string
          grammar_issues?: Json
          id?: string
          practice_suggestions?: Json
          recording_id?: string
          shared_with_teacher?: boolean | null
          struggle_areas?: Json
          student_id?: string
          teacher_report?: string | null
          topics_discussed?: Json
          updated_at?: string
          vocabulary_gaps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analysis_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "conversation_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_recordings: {
        Row: {
          audio_segments: Json
          created_at: string
          duration_seconds: number | null
          id: string
          recording_date: string
          status: string
          student_id: string
          transcription: string | null
          updated_at: string
        }
        Insert: {
          audio_segments?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          recording_date: string
          status?: string
          student_id: string
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          audio_segments?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          recording_date?: string
          status?: string
          student_id?: string
          transcription?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_type: string
          created_at: string
          description: string | null
          duration_weeks: number | null
          format: string
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
          price_usd: number
          sessions_count: number | null
          teacher_payout_percentage: number | null
          updated_at: string
        }
        Insert: {
          course_type: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          format: string
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
          price_usd: number
          sessions_count?: number | null
          teacher_payout_percentage?: number | null
          updated_at?: string
        }
        Update: {
          course_type?: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          format?: string
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          price_usd?: number
          sessions_count?: number | null
          teacher_payout_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      drama_comments: {
        Row: {
          created_at: string
          drama_id: string
          id: string
          is_live_chat: boolean | null
          message: string
          timestamp_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          drama_id: string
          id?: string
          is_live_chat?: boolean | null
          message: string
          timestamp_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          drama_id?: string
          id?: string
          is_live_chat?: boolean | null
          message?: string
          timestamp_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drama_comments_drama_id_fkey"
            columns: ["drama_id"]
            isOneToOne: false
            referencedRelation: "k_dramas"
            referencedColumns: ["id"]
          },
        ]
      }
      drama_reactions: {
        Row: {
          created_at: string
          drama_id: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drama_id: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          drama_id?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drama_reactions_drama_id_fkey"
            columns: ["drama_id"]
            isOneToOne: false
            referencedRelation: "k_dramas"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          end_date: string | null
          enrollment_date: string
          id: string
          payment_amount: number
          payment_status: string
          start_date: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          end_date?: string | null
          enrollment_date?: string
          id?: string
          payment_amount: number
          payment_status?: string
          start_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          end_date?: string | null
          enrollment_date?: string
          id?: string
          payment_amount?: number
          payment_status?: string
          start_date?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_records: {
        Row: {
          amount: number
          category: string | null
          cheque_file_path: string | null
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          month_period: string
          payment_id: string | null
          record_date: string
          record_type: string
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          cheque_file_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          month_period: string
          payment_id?: string | null
          record_date?: string
          record_type: string
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          cheque_file_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          month_period?: string
          payment_id?: string | null
          record_date?: string
          record_type?: string
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_records_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_records_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "monthly_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      group_enrollments: {
        Row: {
          enrolled_at: string
          group_id: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          enrolled_at?: string
          group_id: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          enrolled_at?: string
          group_id?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          current_students_count: number
          day_of_week: number
          description: string | null
          duration_minutes: number
          id: string
          level: string
          max_students: number
          name: string
          start_time: string
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_students_count?: number
          day_of_week: number
          description?: string | null
          duration_minutes?: number
          id?: string
          level: string
          max_students?: number
          name: string
          start_time: string
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_students_count?: number
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          level?: string
          max_students?: number
          name?: string
          start_time?: string
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          ai_grade: number | null
          created_at: string
          description: string | null
          due_date: string | null
          feedback: string | null
          id: string
          lesson_id: string
          status: string
          student_id: string
          submission_text: string | null
          submission_url: string | null
          teacher_grade: number | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_grade?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          feedback?: string | null
          id?: string
          lesson_id: string
          status?: string
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          teacher_grade?: number | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_grade?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          feedback?: string | null
          id?: string
          lesson_id?: string
          status?: string
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          teacher_grade?: number | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "homework_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      k_dramas: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          episode_number: number | null
          id: string
          is_live: boolean | null
          scheduled_at: string | null
          season_number: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          episode_number?: number | null
          id?: string
          is_live?: boolean | null
          scheduled_at?: string | null
          season_number?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          episode_number?: number | null
          id?: string
          is_live?: boolean | null
          scheduled_at?: string | null
          season_number?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      lesson_conversations: {
        Row: {
          conversation_analysis_id: string
          created_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          conversation_analysis_id: string
          created_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          conversation_analysis_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_conversations_conversation_analysis_id_fkey"
            columns: ["conversation_analysis_id"]
            isOneToOne: false
            referencedRelation: "conversation_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_conversations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_packages: {
        Row: {
          created_at: string
          id: string
          lessons_purchased: number
          lessons_remaining: number
          lessons_used: number
          month_period: string
          price_per_lesson: number
          purchase_date: string
          status: string
          student_id: string
          total_amount_paid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lessons_purchased: number
          lessons_remaining: number
          lessons_used?: number
          month_period: string
          price_per_lesson?: number
          purchase_date?: string
          status?: string
          student_id: string
          total_amount_paid: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lessons_purchased?: number
          lessons_remaining?: number
          lessons_used?: number
          month_period?: string
          price_per_lesson?: number
          purchase_date?: string
          status?: string
          student_id?: string
          total_amount_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      lesson_reviews: {
        Row: {
          ai_feedback: Json | null
          ai_score: number | null
          created_at: string
          cultural_accuracy_score: number | null
          engagement_score: number | null
          error_correction_score: number | null
          id: string
          lesson_id: string
          pacing_score: number | null
          student_comment: string | null
          student_id: string
          student_rating: number | null
          teacher_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          cultural_accuracy_score?: number | null
          engagement_score?: number | null
          error_correction_score?: number | null
          id?: string
          lesson_id: string
          pacing_score?: number | null
          student_comment?: string | null
          student_id: string
          student_rating?: number | null
          teacher_id: string
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          cultural_accuracy_score?: number | null
          engagement_score?: number | null
          error_correction_score?: number | null
          id?: string
          lesson_id?: string
          pacing_score?: number | null
          student_comment?: string | null
          student_id?: string
          student_rating?: number | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reviews_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lesson_reviews_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          duration_minutes: number
          enrollment_id: string | null
          id: string
          is_video_lesson: boolean | null
          lesson_type: string
          meeting_link: string | null
          notes: string | null
          package_id: string | null
          price_usd: number | null
          scheduled_at: string
          status: string
          student_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          enrollment_id?: string | null
          id?: string
          is_video_lesson?: boolean | null
          lesson_type: string
          meeting_link?: string | null
          notes?: string | null
          package_id?: string | null
          price_usd?: number | null
          scheduled_at: string
          status?: string
          student_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          enrollment_id?: string | null
          id?: string
          is_video_lesson?: boolean | null
          lesson_type?: string
          meeting_link?: string | null
          notes?: string | null
          package_id?: string | null
          price_usd?: number | null
          scheduled_at?: string
          status?: string
          student_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "lesson_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      monthly_payments: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          month_period: string
          package_id: string | null
          payment_date: string
          payment_method: string | null
          payment_status: string
          student_id: string
          transaction_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          month_period: string
          package_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_status?: string
          student_id: string
          transaction_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          month_period?: string
          package_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_status?: string
          student_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "lesson_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          enrollment_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          student_id: string
          transaction_id: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          enrollment_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          student_id: string
          transaction_id?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          student_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          teacher_levels: string[] | null
          topik_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          teacher_levels?: string[] | null
          topik_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          teacher_levels?: string[] | null
          topik_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_availability: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          preferred_date: string
          preferred_level: string
          preferred_time: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          preferred_date: string
          preferred_level: string
          preferred_time: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          preferred_date?: string
          preferred_level?: string
          preferred_time?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          student_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          student_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          student_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          level: string
          start_time: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          level?: string
          start_time: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          level?: string
          start_time?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_payouts: {
        Row: {
          created_at: string
          id: string
          lessons_count: number
          paid_at: string | null
          payout_amount: number
          payout_percentage: number
          period_end: string
          period_start: string
          status: string
          teacher_id: string
          total_revenue: number
        }
        Insert: {
          created_at?: string
          id?: string
          lessons_count: number
          paid_at?: string | null
          payout_amount: number
          payout_percentage: number
          period_end: string
          period_start: string
          status?: string
          teacher_id: string
          total_revenue: number
        }
        Update: {
          created_at?: string
          id?: string
          lessons_count?: number
          paid_at?: string | null
          payout_amount?: number
          payout_percentage?: number
          period_end?: string
          period_start?: string
          status?: string
          teacher_id?: string
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payouts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_lessons: {
        Row: {
          ai_insights: Json | null
          ai_transcript: Json | null
          created_at: string | null
          end_time: string | null
          id: string
          lesson_id: string
          start_time: string | null
          status: string
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          ai_insights?: Json | null
          ai_transcript?: Json | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          lesson_id: string
          start_time?: string | null
          status?: string
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          ai_insights?: Json | null
          ai_transcript?: Json | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          lesson_id?: string
          start_time?: string | null
          status?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_notes: {
        Row: {
          context: string | null
          created_at: string
          drama_id: string
          id: string
          timestamp_seconds: number | null
          translation: string | null
          user_id: string
          word: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          drama_id: string
          id?: string
          timestamp_seconds?: number | null
          translation?: string | null
          user_id: string
          word: string
        }
        Update: {
          context?: string | null
          created_at?: string
          drama_id?: string
          id?: string
          timestamp_seconds?: number | null
          translation?: string | null
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_notes_drama_id_fkey"
            columns: ["drama_id"]
            isOneToOne: false
            referencedRelation: "k_dramas"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          completed: boolean | null
          drama_id: string
          id: string
          last_watched_at: string
          progress_seconds: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          drama_id: string
          id?: string
          last_watched_at?: string
          progress_seconds?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          drama_id?: string
          id?: string
          last_watched_at?: string
          progress_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_drama_id_fkey"
            columns: ["drama_id"]
            isOneToOne: false
            referencedRelation: "k_dramas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rollover_unused_lessons: {
        Args: { _new_month: string; _old_month: string; _student_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
