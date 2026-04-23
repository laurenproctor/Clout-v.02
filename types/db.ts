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
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_imagery_profiles: {
        Row: {
          composition: string | null
          created_at: string
          example_board: string[]
          id: string
          imagery_type: string | null
          mood_traits: string[]
          negative_rules: string[]
          overlay_text_style: string | null
          updated_at: string
          visual_styles: string[]
          workspace_id: string
        }
        Insert: {
          composition?: string | null
          created_at?: string
          example_board?: string[]
          id?: string
          imagery_type?: string | null
          mood_traits?: string[]
          negative_rules?: string[]
          overlay_text_style?: string | null
          updated_at?: string
          visual_styles?: string[]
          workspace_id: string
        }
        Update: {
          composition?: string | null
          created_at?: string
          example_board?: string[]
          id?: string
          imagery_type?: string | null
          mood_traits?: string[]
          negative_rules?: string[]
          overlay_text_style?: string | null
          updated_at?: string
          visual_styles?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_imagery_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          accent_color: string
          brand_name: string | null
          created_at: string
          font_body: string
          font_body_url: string | null
          font_heading: string
          font_heading_url: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          style_traits: Json
          tone_traits: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string
          brand_name?: string | null
          created_at?: string
          font_body?: string
          font_body_url?: string | null
          font_heading?: string
          font_heading_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          style_traits?: Json
          tone_traits?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string
          brand_name?: string | null
          created_at?: string
          font_body?: string
          font_body_url?: string | null
          font_heading?: string
          font_heading_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          style_traits?: Json
          tone_traits?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      captures: {
        Row: {
          audio_path: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_private: boolean
          notes: string | null
          raw_content: string | null
          source: Database["public"]["Enums"]["capture_source"]
          source_url: string | null
          status: Database["public"]["Enums"]["capture_status"]
          structured_data: Json | null
          tags: string[]
          transcript: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          notes?: string | null
          raw_content?: string | null
          source: Database["public"]["Enums"]["capture_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["capture_status"]
          structured_data?: Json | null
          tags?: string[]
          transcript?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          notes?: string | null
          raw_content?: string | null
          source?: Database["public"]["Enums"]["capture_source"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["capture_status"]
          structured_data?: Json | null
          tags?: string[]
          transcript?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_credentials: {
        Row: {
          access_token: string
          account_email: string | null
          account_id: string | null
          account_name: string | null
          channel_id: string
          created_at: string | null
          expires_at: number | null
          id: string
          refresh_token: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          access_token: string
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          channel_id: string
          created_at?: string | null
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string
          account_email?: string | null
          account_id?: string | null
          account_name?: string | null
          channel_id?: string
          created_at?: string | null
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_credentials_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          platform: Database["public"]["Enums"]["channel_platform"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform: Database["public"]["Enums"]["channel_platform"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform?: Database["public"]["Enums"]["channel_platform"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          capture_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          lens_id: string
          model: string
          profile_id: string
          prompt_snapshot: string | null
          raw_response: string | null
          status: Database["public"]["Enums"]["generation_status"]
          token_count: number | null
          workspace_id: string
        }
        Insert: {
          capture_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          lens_id: string
          model: string
          profile_id: string
          prompt_snapshot?: string | null
          raw_response?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          token_count?: number | null
          workspace_id: string
        }
        Update: {
          capture_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          lens_id?: string
          model?: string
          profile_id?: string
          prompt_snapshot?: string | null
          raw_response?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          token_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          payload: Json
          resource_id: string
          resource_type: string
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          workspace_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          resource_id: string
          resource_type: string
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          workspace_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          resource_id?: string
          resource_type?: string
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lenses: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope: Database["public"]["Enums"]["lens_scope"]
          system_prompt: string
          tags: string[] | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope?: Database["public"]["Enums"]["lens_scope"]
          system_prompt: string
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["lens_scope"]
          system_prompt?: string
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_generations: {
        Row: {
          created_at: string
          draft_post: string | null
          id: string
          positioning: string | null
          post_ideas: Json
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          draft_post?: string | null
          id?: string
          positioning?: string | null
          post_ideas?: Json
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          draft_post?: string | null
          id?: string
          positioning?: string | null
          post_ideas?: Json
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      output_versions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string
          edited_by: string | null
          id: string
          output_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string
          edited_by?: string | null
          id?: string
          output_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string
          edited_by?: string | null
          id?: string
          output_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "output_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "output_versions_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      outputs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_for_week: boolean
          channel_id: string | null
          content: Json
          created_at: string
          deleted_at: string | null
          generation_id: string
          id: string
          last_publish_error: string | null
          performance_snapshot: Json | null
          provider_post_id: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["output_status"]
          title: string | null
          updated_at: string
          week_bucket: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_for_week?: boolean
          channel_id?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          generation_id: string
          id?: string
          last_publish_error?: string | null
          performance_snapshot?: Json | null
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["output_status"]
          title?: string | null
          updated_at?: string
          week_bucket?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_for_week?: boolean
          channel_id?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          generation_id?: string
          id?: string
          last_publish_error?: string | null
          performance_snapshot?: Json | null
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["output_status"]
          title?: string | null
          updated_at?: string
          week_bucket?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outputs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outputs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outputs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outputs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      private_enrichments: {
        Row: {
          capture_id: string
          content: string
          created_at: string
          id: string
          insights: Json
          lens_id: string | null
          model: string
          prompt_snapshot: string | null
          workspace_id: string
        }
        Insert: {
          capture_id: string
          content: string
          created_at?: string
          id?: string
          insights?: Json
          lens_id?: string | null
          model: string
          prompt_snapshot?: string | null
          workspace_id: string
        }
        Update: {
          capture_id?: string
          content?: string
          created_at?: string
          id?: string
          insights?: Json
          lens_id?: string | null
          model?: string
          prompt_snapshot?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_enrichments_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_enrichments_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_enrichments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          audience_perception: string[] | null
          audience_targets: string[] | null
          bio: string | null
          channels: string[] | null
          created_at: string
          display_name: string | null
          expertise: string | null
          first_name: string | null
          first_session_dismissed_at: string | null
          id: string
          industries: string[] | null
          industry: string | null
          last_name: string | null
          mental_models: Json
          onboarding_completed_at: string | null
          philosophies: Json
          private_feed_operator_visible: boolean
          profile_insights: Json | null
          purpose: string | null
          role: string | null
          sample_content: string[] | null
          target_audiences: string[] | null
          tone_notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          audience_perception?: string[] | null
          audience_targets?: string[] | null
          bio?: string | null
          channels?: string[] | null
          created_at?: string
          display_name?: string | null
          expertise?: string | null
          first_name?: string | null
          first_session_dismissed_at?: string | null
          id?: string
          industries?: string[] | null
          industry?: string | null
          last_name?: string | null
          mental_models?: Json
          onboarding_completed_at?: string | null
          philosophies?: Json
          private_feed_operator_visible?: boolean
          profile_insights?: Json | null
          purpose?: string | null
          role?: string | null
          sample_content?: string[] | null
          target_audiences?: string[] | null
          tone_notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          audience_perception?: string[] | null
          audience_targets?: string[] | null
          bio?: string | null
          channels?: string[] | null
          created_at?: string
          display_name?: string | null
          expertise?: string | null
          first_name?: string | null
          first_session_dismissed_at?: string | null
          id?: string
          industries?: string[] | null
          industry?: string | null
          last_name?: string | null
          mental_models?: Json
          onboarding_completed_at?: string | null
          philosophies?: Json
          private_feed_operator_visible?: boolean
          profile_insights?: Json | null
          purpose?: string | null
          role?: string | null
          sample_content?: string[] | null
          target_audiences?: string[] | null
          tone_notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_logs: {
        Row: {
          channel_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          output_id: string
          platform: string
          provider_post_id: string | null
          status: string
          was_retry: boolean | null
          workspace_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          output_id: string
          platform: string
          provider_post_id?: string | null
          status: string
          was_retry?: boolean | null
          workspace_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          output_id?: string
          platform?: string
          provider_post_id?: string | null
          status?: string
          was_retry?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_logs_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_preferences: {
        Row: {
          created_at: string
          id: string
          posts_per_week: number
          preferred_days: number[]
          preferred_times: string[]
          timezone: string
          updated_at: string
          weekly_digest_day: number | null
          weekly_digest_enabled: boolean
          weekly_digest_hour: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          posts_per_week?: number
          preferred_days?: number[]
          preferred_times?: string[]
          timezone?: string
          updated_at?: string
          weekly_digest_day?: number | null
          weekly_digest_enabled?: boolean
          weekly_digest_hour?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          posts_per_week?: number
          preferred_days?: number[]
          preferred_times?: string[]
          timezone?: string
          updated_at?: string
          weekly_digest_day?: number | null
          weekly_digest_enabled?: boolean
          weekly_digest_hour?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          entitlements: Json
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlements?: Json
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlements?: Json
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          browser_info: string | null
          category: string
          created_at: string
          current_route: string | null
          id: string
          message: string
          screenshot_url: string | null
          user_email: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          browser_info?: string | null
          category: string
          created_at?: string
          current_route?: string | null
          id?: string
          message: string
          screenshot_url?: string | null
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          browser_info?: string | null
          category?: string
          created_at?: string
          current_route?: string | null
          id?: string
          message?: string
          screenshot_url?: string | null
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["usage_event_type"]
          id: string
          metadata: Json
          quantity: number
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["usage_event_type"]
          id?: string
          metadata?: Json
          quantity?: number
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["usage_event_type"]
          id?: string
          metadata?: Json
          quantity?: number
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          clerk_id: string
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          operator_role: Database["public"]["Enums"]["operator_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_id: string
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          operator_role?: Database["public"]["Enums"]["operator_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          operator_role?: Database["public"]["Enums"]["operator_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          assigned_operator_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_id: { Args: never; Returns: string }
      is_assigned_operator: { Args: { ws_id: string }; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      workspace_role_for: {
        Args: { ws_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "publish"
        | "approve"
        | "assign"
        | "restore"
        | "soft_delete"
      capture_source: "text" | "voice" | "structured" | "url"
      capture_status: "pending" | "processing" | "ready" | "failed"
      channel_platform: "linkedin" | "newsletter" | "twitter"
      generation_status: "pending" | "generating" | "complete" | "failed"
      job_status: "queued" | "running" | "done" | "failed" | "canceled"
      job_type: "transcribe" | "generate" | "summarize" | "reformat"
      lens_scope: "system" | "workspace"
      operator_role: "super_admin" | "agency_operator"
      output_status:
        | "draft"
        | "review"
        | "approved"
        | "queued"
        | "publishing"
        | "published"
        | "failed"
        | "archived"
      subscription_plan: "free" | "pro" | "business" | "enterprise"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "paused"
      usage_event_type:
        | "capture_created"
        | "generation_run"
        | "output_published"
        | "lens_applied"
        | "voice_transcribed"
        | "member_invited"
      workspace_role: "owner" | "admin" | "editor" | "viewer"
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
      audit_action: [
        "create",
        "update",
        "delete",
        "publish",
        "approve",
        "assign",
        "restore",
        "soft_delete",
      ],
      capture_source: ["text", "voice", "structured", "url"],
      capture_status: ["pending", "processing", "ready", "failed"],
      channel_platform: ["linkedin", "newsletter", "twitter"],
      generation_status: ["pending", "generating", "complete", "failed"],
      job_status: ["queued", "running", "done", "failed", "canceled"],
      job_type: ["transcribe", "generate", "summarize", "reformat"],
      lens_scope: ["system", "workspace"],
      operator_role: ["super_admin", "agency_operator"],
      output_status: [
        "draft",
        "review",
        "approved",
        "queued",
        "publishing",
        "published",
        "failed",
        "archived",
      ],
      subscription_plan: ["free", "pro", "business", "enterprise"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "paused",
      ],
      usage_event_type: [
        "capture_created",
        "generation_run",
        "output_published",
        "lens_applied",
        "voice_transcribed",
        "member_invited",
      ],
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
