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
      analytics_connections: {
        Row: {
          access_token: string
          connected_by: string | null
          created_at: string
          expires_at: number | null
          id: string
          provider: string
          refresh_token: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          connected_by?: string | null
          created_at?: string
          expires_at?: number | null
          id?: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          connected_by?: string | null
          created_at?: string
          expires_at?: number | null
          id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          avg_engagement_time: number | null
          conversion_type: string | null
          conversions: number
          engaged_sessions: number
          event_date: string
          id: string
          landing_page: string | null
          property_id: string
          revenue: number | null
          session_count: number
          synced_at: string
          utm_campaign: string | null
          utm_campaign_n: string | null
          utm_content: string | null
          utm_content_n: string | null
          utm_medium: string | null
          utm_medium_n: string | null
          utm_source: string | null
          utm_source_n: string | null
          workspace_id: string
        }
        Insert: {
          avg_engagement_time?: number | null
          conversion_type?: string | null
          conversions?: number
          engaged_sessions?: number
          event_date: string
          id?: string
          landing_page?: string | null
          property_id: string
          revenue?: number | null
          session_count?: number
          synced_at?: string
          utm_campaign?: string | null
          utm_campaign_n?: string | null
          utm_content?: string | null
          utm_content_n?: string | null
          utm_medium?: string | null
          utm_medium_n?: string | null
          utm_source?: string | null
          utm_source_n?: string | null
          workspace_id: string
        }
        Update: {
          avg_engagement_time?: number | null
          conversion_type?: string | null
          conversions?: number
          engaged_sessions?: number
          event_date?: string
          id?: string
          landing_page?: string | null
          property_id?: string
          revenue?: number | null
          session_count?: number
          synced_at?: string
          utm_campaign?: string | null
          utm_campaign_n?: string | null
          utm_content?: string | null
          utm_content_n?: string | null
          utm_medium?: string | null
          utm_medium_n?: string | null
          utm_source?: string | null
          utm_source_n?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_properties: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          property_id: string
          property_name: string | null
          property_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          property_id: string
          property_name?: string | null
          property_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          property_id?: string
          property_name?: string | null
          property_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_events: {
        Row: {
          created_at: string
          event_type: string
          generation_id: string | null
          id: string
          payload: Json
          session_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          generation_id?: string | null
          id?: string
          payload?: Json
          session_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          generation_id?: string | null
          id?: string
          payload?: Json
          session_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "assistant_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_generations: {
        Row: {
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          generation_config: Json | null
          id: string
          inferred_intent: Json | null
          latency_ms: number | null
          model: string | null
          output_format: string | null
          output_id: string | null
          parent_generation_id: string | null
          prompt_version: string | null
          provider: string | null
          retry_count: number
          session_id: string
          status: string
          stream_state: string | null
          tokens_input: number | null
          tokens_output: number | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          generation_config?: Json | null
          id?: string
          inferred_intent?: Json | null
          latency_ms?: number | null
          model?: string | null
          output_format?: string | null
          output_id?: string | null
          parent_generation_id?: string | null
          prompt_version?: string | null
          provider?: string | null
          retry_count?: number
          session_id: string
          status?: string
          stream_state?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          generation_config?: Json | null
          id?: string
          inferred_intent?: Json | null
          latency_ms?: number | null
          model?: string | null
          output_format?: string | null
          output_id?: string | null
          parent_generation_id?: string | null
          prompt_version?: string | null
          provider?: string | null
          retry_count?: number
          session_id?: string
          status?: string
          stream_state?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_generations_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_generations_parent_generation_id_fkey"
            columns: ["parent_generation_id"]
            isOneToOne: false
            referencedRelation: "assistant_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_generations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string | null
          role: string
          session_id: string
          tokens_used: number | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          session_id: string
          tokens_used?: number | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          session_id?: string
          tokens_used?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assistant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_sessions: {
        Row: {
          capture_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          capture_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          capture_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_sessions_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bluesky_oauth_sessions: {
        Row: {
          channel_id: string | null
          session_data: Json
          sub: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          channel_id?: string | null
          session_data: Json
          sub: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          channel_id?: string | null
          session_data?: Json
          sub?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bluesky_oauth_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bluesky_oauth_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bluesky_oauth_states: {
        Row: {
          expires_at: string
          key: string
          state_data: Json
        }
        Insert: {
          expires_at: string
          key: string
          state_data: Json
        }
        Update: {
          expires_at?: string
          key?: string
          state_data?: Json
        }
        Relationships: []
      }
      brand_imagery_profiles: {
        Row: {
          composition: string | null
          created_at: string
          example_board: string[]
          generation_notes: string | null
          id: string
          imagery_type: string | null
          mood_traits: string[]
          negative_example_board: string[] | null
          negative_rules: string[]
          overlay_text_style: string | null
          subjects: string[] | null
          updated_at: string
          uploaded_imagery: string[] | null
          visual_styles: string[]
          workspace_id: string
        }
        Insert: {
          composition?: string | null
          created_at?: string
          example_board?: string[]
          generation_notes?: string | null
          id?: string
          imagery_type?: string | null
          mood_traits?: string[]
          negative_example_board?: string[] | null
          negative_rules?: string[]
          overlay_text_style?: string | null
          subjects?: string[] | null
          updated_at?: string
          uploaded_imagery?: string[] | null
          visual_styles?: string[]
          workspace_id: string
        }
        Update: {
          composition?: string | null
          created_at?: string
          example_board?: string[]
          generation_notes?: string | null
          id?: string
          imagery_type?: string | null
          mood_traits?: string[]
          negative_example_board?: string[] | null
          negative_rules?: string[]
          overlay_text_style?: string | null
          subjects?: string[] | null
          updated_at?: string
          uploaded_imagery?: string[] | null
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
          accent_color_2: string | null
          brand_name: string | null
          created_at: string
          dark_bg_color: string | null
          font_body: string
          font_body_url: string | null
          font_heading: string
          font_heading_url: string | null
          id: string
          logo_library: string[] | null
          logo_url: string | null
          logo_url_dark: string | null
          logo_url_light: string | null
          preferred_template_mode: string
          primary_color: string
          secondary_color: string
          signature_template_id: string | null
          style_traits: Json
          token_overrides: Json | null
          tone_traits: string[]
          typography_settings: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string
          accent_color_2?: string | null
          brand_name?: string | null
          created_at?: string
          dark_bg_color?: string | null
          font_body?: string
          font_body_url?: string | null
          font_heading?: string
          font_heading_url?: string | null
          id?: string
          logo_library?: string[] | null
          logo_url?: string | null
          logo_url_dark?: string | null
          logo_url_light?: string | null
          preferred_template_mode?: string
          primary_color?: string
          secondary_color?: string
          signature_template_id?: string | null
          style_traits?: Json
          token_overrides?: Json | null
          tone_traits?: string[]
          typography_settings?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string
          accent_color_2?: string | null
          brand_name?: string | null
          created_at?: string
          dark_bg_color?: string | null
          font_body?: string
          font_body_url?: string | null
          font_heading?: string
          font_heading_url?: string | null
          id?: string
          logo_library?: string[] | null
          logo_url?: string | null
          logo_url_dark?: string | null
          logo_url_light?: string | null
          preferred_template_mode?: string
          primary_color?: string
          secondary_color?: string
          signature_template_id?: string | null
          style_traits?: Json
          token_overrides?: Json | null
          tone_traits?: string[]
          typography_settings?: Json | null
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
          extracted_angles: Json | null
          id: string
          is_private: boolean
          notes: string | null
          raw_content: string | null
          research_sources: Json | null
          research_summary: string | null
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
          extracted_angles?: Json | null
          id?: string
          is_private?: boolean
          notes?: string | null
          raw_content?: string | null
          research_sources?: Json | null
          research_summary?: string | null
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
          extracted_angles?: Json | null
          id?: string
          is_private?: boolean
          notes?: string | null
          raw_content?: string | null
          research_sources?: Json | null
          research_summary?: string | null
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
          account_id: string | null
          account_type: string
          config: Json
          created_at: string
          google_account_id: string | null
          google_location_address: Json | null
          google_location_name: string | null
          google_location_numeric_id: string | null
          google_profile_photo_url: string | null
          google_verified: boolean | null
          id: string
          is_active: boolean
          label: string | null
          platform: Database["public"]["Enums"]["channel_platform"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          account_type?: string
          config?: Json
          created_at?: string
          google_account_id?: string | null
          google_location_address?: Json | null
          google_location_name?: string | null
          google_location_numeric_id?: string | null
          google_profile_photo_url?: string | null
          google_verified?: boolean | null
          id?: string
          is_active?: boolean
          label?: string | null
          platform: Database["public"]["Enums"]["channel_platform"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          account_type?: string
          config?: Json
          created_at?: string
          google_account_id?: string | null
          google_location_address?: Json | null
          google_location_name?: string | null
          google_location_numeric_id?: string | null
          google_profile_photo_url?: string | null
          google_verified?: boolean | null
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
      competitor_content_global: {
        Row: {
          competitor_domain: string
          content: string | null
          external_id: string
          fetched_at: string
          id: string
          importance_score: number
          metrics: Json
          published_at: string | null
          source_confidence: string
          source_type: string
          summary: string | null
          thumbnail_url: string | null
          title: string | null
          topics: Json
          url: string
        }
        Insert: {
          competitor_domain: string
          content?: string | null
          external_id: string
          fetched_at?: string
          id?: string
          importance_score?: number
          metrics?: Json
          published_at?: string | null
          source_confidence?: string
          source_type: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topics?: Json
          url: string
        }
        Update: {
          competitor_domain?: string
          content?: string | null
          external_id?: string
          fetched_at?: string
          id?: string
          importance_score?: number
          metrics?: Json
          published_at?: string | null
          source_confidence?: string
          source_type?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string | null
          topics?: Json
          url?: string
        }
        Relationships: []
      }
      competitor_entities: {
        Row: {
          added_at: string | null
          domain: string | null
          gdelt_entity_id: string | null
          handle: string | null
          id: string
          name: string
          platforms: string[] | null
          workspace_id: string | null
        }
        Insert: {
          added_at?: string | null
          domain?: string | null
          gdelt_entity_id?: string | null
          handle?: string | null
          id?: string
          name: string
          platforms?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          added_at?: string | null
          domain?: string | null
          gdelt_entity_id?: string | null
          handle?: string | null
          id?: string
          name?: string
          platforms?: string[] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_entities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_mentions: {
        Row: {
          angle_summary: string | null
          card_id: string | null
          competitor_id: string | null
          fetched_at: string | null
          has_coverage: boolean | null
          headline: string
          id: string
          platform: string | null
          published_at: string | null
          signal_id: string | null
          tone: Database["public"]["Enums"]["tone_val"] | null
        }
        Insert: {
          angle_summary?: string | null
          card_id?: string | null
          competitor_id?: string | null
          fetched_at?: string | null
          has_coverage?: boolean | null
          headline: string
          id?: string
          platform?: string | null
          published_at?: string | null
          signal_id?: string | null
          tone?: Database["public"]["Enums"]["tone_val"] | null
        }
        Update: {
          angle_summary?: string | null
          card_id?: string | null
          competitor_id?: string | null
          fetched_at?: string | null
          has_coverage?: boolean | null
          headline?: string
          id?: string
          platform?: string | null
          published_at?: string | null
          signal_id?: string | null
          tone?: Database["public"]["Enums"]["tone_val"] | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_mentions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "signal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_mentions_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_mentions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_cluster_signals: {
        Row: {
          card_id: string
          cluster_id: string
          weight: number | null
        }
        Insert: {
          card_id: string
          cluster_id: string
          weight?: number | null
        }
        Update: {
          card_id?: string
          cluster_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_cluster_signals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "signal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_cluster_signals_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "concept_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_clusters: {
        Row: {
          cluster_name: string
          coverage_velocity: number | null
          description: string | null
          entity_identifiers: string[] | null
          first_emerged_at: string | null
          id: string
          peak_estimated_at: string | null
          status: string
          updated_at: string | null
          whitespace_score: number | null
        }
        Insert: {
          cluster_name: string
          coverage_velocity?: number | null
          description?: string | null
          entity_identifiers?: string[] | null
          first_emerged_at?: string | null
          id?: string
          peak_estimated_at?: string | null
          status?: string
          updated_at?: string | null
          whitespace_score?: number | null
        }
        Update: {
          cluster_name?: string
          coverage_velocity?: number | null
          description?: string | null
          entity_identifiers?: string[] | null
          first_emerged_at?: string | null
          id?: string
          peak_estimated_at?: string | null
          status?: string
          updated_at?: string | null
          whitespace_score?: number | null
        }
        Relationships: []
      }
      content_attribution: {
        Row: {
          canonical_content_id: string | null
          created_at: string
          id: string
          lens_id: string | null
          narrative_type: string | null
          output_id: string
          platform: string
          strategic_intent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          canonical_content_id?: string | null
          created_at?: string
          id?: string
          lens_id?: string | null
          narrative_type?: string | null
          output_id: string
          platform: string
          strategic_intent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          canonical_content_id?: string | null
          created_at?: string
          id?: string
          lens_id?: string | null
          narrative_type?: string | null
          output_id?: string
          platform?: string
          strategic_intent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_attribution_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attribution_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: true
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attribution_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_cache: {
        Row: {
          card_id: string | null
          content: string | null
          format: Database["public"]["Enums"]["draft_format"]
          generated_at: string | null
          id: string
          invalidated_at: string | null
          model_id: string | null
          prompt_version: string | null
          system_prompt_hash: string | null
          tone: Database["public"]["Enums"]["draft_tone"]
          user_id: string | null
        }
        Insert: {
          card_id?: string | null
          content?: string | null
          format: Database["public"]["Enums"]["draft_format"]
          generated_at?: string | null
          id?: string
          invalidated_at?: string | null
          model_id?: string | null
          prompt_version?: string | null
          system_prompt_hash?: string | null
          tone: Database["public"]["Enums"]["draft_tone"]
          user_id?: string | null
        }
        Update: {
          card_id?: string | null
          content?: string | null
          format?: Database["public"]["Enums"]["draft_format"]
          generated_at?: string | null
          id?: string
          invalidated_at?: string | null
          model_id?: string | null
          prompt_version?: string | null
          system_prompt_hash?: string | null
          tone?: Database["public"]["Enums"]["draft_tone"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_cache_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "signal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          attempt_count: number
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          last_attempted_at: string | null
          payload: Json | null
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string
          type: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          last_attempted_at?: string | null
          payload?: Json | null
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          type: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          last_attempted_at?: string | null
          payload?: Json | null
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          type?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          angle_id: string | null
          capture_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          generation_group_id: string | null
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
          angle_id?: string | null
          capture_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          generation_group_id?: string | null
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
          angle_id?: string | null
          capture_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          generation_group_id?: string | null
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
      lens_performance: {
        Row: {
          authority_score: number | null
          avg_assisted_conversions: number | null
          avg_conversion_rate: number | null
          avg_traffic: number | null
          computed_at: string
          computed_for_date: string
          id: string
          lens_id: string
          resonance_score: number | null
          workspace_id: string
        }
        Insert: {
          authority_score?: number | null
          avg_assisted_conversions?: number | null
          avg_conversion_rate?: number | null
          avg_traffic?: number | null
          computed_at?: string
          computed_for_date?: string
          id?: string
          lens_id: string
          resonance_score?: number | null
          workspace_id: string
        }
        Update: {
          authority_score?: number | null
          avg_assisted_conversions?: number | null
          avg_conversion_rate?: number | null
          avg_traffic?: number | null
          computed_at?: string
          computed_for_date?: string
          id?: string
          lens_id?: string
          resonance_score?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lens_performance_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_performance_workspace_id_fkey"
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
          lens_type: string | null
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
          lens_type?: string | null
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
          lens_type?: string | null
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
      narrative_performance: {
        Row: {
          avg_conversion_rate: number | null
          avg_engagement_rate: number | null
          avg_session_duration: number | null
          computed_at: string
          computed_for_date: string
          id: string
          narrative_type: string
          sample_size: number
          workspace_id: string
        }
        Insert: {
          avg_conversion_rate?: number | null
          avg_engagement_rate?: number | null
          avg_session_duration?: number | null
          computed_at?: string
          computed_for_date?: string
          id?: string
          narrative_type: string
          sample_size?: number
          workspace_id: string
        }
        Update: {
          avg_conversion_rate?: number | null
          avg_engagement_rate?: number | null
          avg_session_duration?: number | null
          computed_at?: string
          computed_for_date?: string
          id?: string
          narrative_type?: string
          sample_size?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "narrative_performance_workspace_id_fkey"
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
          concept_id: string | null
          content: Json
          content_type: string
          created_at: string
          deleted_at: string | null
          funnel_stage: string | null
          generation_group_id: string | null
          generation_id: string | null
          goal: string | null
          id: string
          last_publish_error: string | null
          narrative_arc_id: string | null
          narrative_arc_name: string | null
          narrative_role: string | null
          performance_snapshot: Json | null
          provider_post_id: string | null
          provider_post_url: string | null
          published_at: string | null
          resonance_prediction: string | null
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
          concept_id?: string | null
          content?: Json
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          funnel_stage?: string | null
          generation_group_id?: string | null
          generation_id?: string | null
          goal?: string | null
          id?: string
          last_publish_error?: string | null
          narrative_arc_id?: string | null
          narrative_arc_name?: string | null
          narrative_role?: string | null
          performance_snapshot?: Json | null
          provider_post_id?: string | null
          provider_post_url?: string | null
          published_at?: string | null
          resonance_prediction?: string | null
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
          concept_id?: string | null
          content?: Json
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          funnel_stage?: string | null
          generation_group_id?: string | null
          generation_id?: string | null
          goal?: string | null
          id?: string
          last_publish_error?: string | null
          narrative_arc_id?: string | null
          narrative_arc_name?: string | null
          narrative_role?: string | null
          performance_snapshot?: Json | null
          provider_post_id?: string | null
          provider_post_url?: string | null
          published_at?: string | null
          resonance_prediction?: string | null
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
      provider_health_logs: {
        Row: {
          channel_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          platform: string
          workspace_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          platform: string
          workspace_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          platform?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_health_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_health_logs_workspace_id_fkey"
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
      published_content: {
        Row: {
          canonical_content_id: string | null
          connection_id: string | null
          content_hash: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          provider: string
          provider_content_id: string | null
          provider_metadata_version: string
          provider_url: string | null
          published_at: string | null
          slug: string | null
          source_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          canonical_content_id?: string | null
          connection_id?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          provider: string
          provider_content_id?: string | null
          provider_metadata_version?: string
          provider_url?: string | null
          published_at?: string | null
          slug?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          canonical_content_id?: string | null
          connection_id?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          provider?: string
          provider_content_id?: string | null
          provider_metadata_version?: string
          provider_url?: string | null
          published_at?: string | null
          slug?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_content_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "publishing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_content_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_connections: {
        Row: {
          consecutive_failure_count: number
          created_at: string
          created_by: string
          encrypted_access_token: string
          id: string
          is_active: boolean
          label: string
          last_error_message: string | null
          last_failed_publish_at: string | null
          last_successful_publish_at: string | null
          metadata: Json
          provider: string
          site_url: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          consecutive_failure_count?: number
          created_at?: string
          created_by: string
          encrypted_access_token: string
          id?: string
          is_active?: boolean
          label: string
          last_error_message?: string | null
          last_failed_publish_at?: string | null
          last_successful_publish_at?: string | null
          metadata?: Json
          provider: string
          site_url: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          consecutive_failure_count?: number
          created_at?: string
          created_by?: string
          encrypted_access_token?: string
          id?: string
          is_active?: boolean
          label?: string
          last_error_message?: string | null
          last_failed_publish_at?: string | null
          last_successful_publish_at?: string | null
          metadata?: Json
          provider?: string
          site_url?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishing_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      publishing_jobs: {
        Row: {
          attempt_count: number
          connection_id: string | null
          content_hash: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          next_retry_at: string | null
          payload: Json
          provider: string
          provider_metadata_version: string
          published_content_id: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          connection_id?: string | null
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          next_retry_at?: string | null
          payload?: Json
          provider: string
          provider_metadata_version?: string
          published_content_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          connection_id?: string | null
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          next_retry_at?: string | null
          payload?: Json
          provider?: string
          provider_metadata_version?: string
          published_content_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "publishing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishing_jobs_published_content_id_fkey"
            columns: ["published_content_id"]
            isOneToOne: false
            referencedRelation: "published_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishing_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishing_jobs_workspace_id_fkey"
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
      search_console_metrics: {
        Row: {
          avg_position: number | null
          clicks: number
          created_at: string
          ctr: number | null
          id: string
          impressions: number
          landing_page: string
          query: string
          recorded_at: string
          site_url: string
          workspace_id: string
        }
        Insert: {
          avg_position?: number | null
          clicks?: number
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          landing_page: string
          query: string
          recorded_at: string
          site_url: string
          workspace_id: string
        }
        Update: {
          avg_position?: number | null
          clicks?: number
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          landing_page?: string
          query?: string
          recorded_at?: string
          site_url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_console_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_cards: {
        Row: {
          competitor_id: string | null
          concept_surfaced_via: string | null
          created_at: string | null
          gdelt_score: number | null
          gdelt_score_label: string | null
          id: string
          is_trending: boolean | null
          matched_service: string | null
          momentum_bar_width: number | null
          momentum_pct: string | null
          refreshed_at: string | null
          signal_id: string | null
          tab: Database["public"]["Enums"]["feed_tab"]
          tags: string[] | null
          timing_classification:
            | Database["public"]["Enums"]["timing_class"]
            | null
          title: string
          tone: Database["public"]["Enums"]["tone_val"]
          why_now: string | null
        }
        Insert: {
          competitor_id?: string | null
          concept_surfaced_via?: string | null
          created_at?: string | null
          gdelt_score?: number | null
          gdelt_score_label?: string | null
          id?: string
          is_trending?: boolean | null
          matched_service?: string | null
          momentum_bar_width?: number | null
          momentum_pct?: string | null
          refreshed_at?: string | null
          signal_id?: string | null
          tab: Database["public"]["Enums"]["feed_tab"]
          tags?: string[] | null
          timing_classification?:
            | Database["public"]["Enums"]["timing_class"]
            | null
          title: string
          tone: Database["public"]["Enums"]["tone_val"]
          why_now?: string | null
        }
        Update: {
          competitor_id?: string | null
          concept_surfaced_via?: string | null
          created_at?: string | null
          gdelt_score?: number | null
          gdelt_score_label?: string | null
          id?: string
          is_trending?: boolean | null
          matched_service?: string | null
          momentum_bar_width?: number | null
          momentum_pct?: string | null
          refreshed_at?: string | null
          signal_id?: string | null
          tab?: Database["public"]["Enums"]["feed_tab"]
          tags?: string[] | null
          timing_classification?:
            | Database["public"]["Enums"]["timing_class"]
            | null
          title?: string
          tone?: Database["public"]["Enums"]["tone_val"]
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_cards_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_entities: {
        Row: {
          confidence: number | null
          entity_name: string
          entity_role: string | null
          entity_type: string
          id: string
          signal_id: string | null
        }
        Insert: {
          confidence?: number | null
          entity_name: string
          entity_role?: string | null
          entity_type: string
          id?: string
          signal_id?: string | null
        }
        Update: {
          confidence?: number | null
          entity_name?: string
          entity_role?: string | null
          entity_type?: string
          id?: string
          signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_entities_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_relationships: {
        Row: {
          entity_a: string
          entity_b: string
          first_seen: string | null
          id: string
          last_seen: string | null
          relationship: string
          signal_count: number | null
          strength: number | null
        }
        Insert: {
          entity_a: string
          entity_b: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          relationship: string
          signal_count?: number | null
          strength?: number | null
        }
        Update: {
          entity_a?: string
          entity_b?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          relationship?: string
          signal_count?: number | null
          strength?: number | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          coverage_48h_pct: number | null
          created_at: string | null
          external_id: string | null
          first_seen_at: string | null
          gdelt_raw_score: number | null
          id: string
          published_at: string | null
          refreshed_at: string | null
          source: string
          source_url: string | null
          summary: string | null
          title: string
          tone: Database["public"]["Enums"]["tone_val"]
        }
        Insert: {
          coverage_48h_pct?: number | null
          created_at?: string | null
          external_id?: string | null
          first_seen_at?: string | null
          gdelt_raw_score?: number | null
          id?: string
          published_at?: string | null
          refreshed_at?: string | null
          source?: string
          source_url?: string | null
          summary?: string | null
          title: string
          tone?: Database["public"]["Enums"]["tone_val"]
        }
        Update: {
          coverage_48h_pct?: number | null
          created_at?: string | null
          external_id?: string | null
          first_seen_at?: string | null
          gdelt_raw_score?: number | null
          id?: string
          published_at?: string | null
          refreshed_at?: string | null
          source?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          tone?: Database["public"]["Enums"]["tone_val"]
        }
        Relationships: []
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
      syndicate_sessions: {
        Row: {
          analysis_version: string | null
          counterfactual_analysis: Json | null
          created_at: string
          extracted_content: Json | null
          id: string
          narrative_analysis: Json | null
          ontology_version: string | null
          prompt_version: string | null
          raw_signals: Json | null
          signal_version: string | null
          source_title: string | null
          source_type: string | null
          source_url: string
          status: string
          strategic_read: Json | null
          timing_data: Json | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          analysis_version?: string | null
          counterfactual_analysis?: Json | null
          created_at?: string
          extracted_content?: Json | null
          id?: string
          narrative_analysis?: Json | null
          ontology_version?: string | null
          prompt_version?: string | null
          raw_signals?: Json | null
          signal_version?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url: string
          status?: string
          strategic_read?: Json | null
          timing_data?: Json | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          analysis_version?: string | null
          counterfactual_analysis?: Json | null
          created_at?: string
          extracted_content?: Json | null
          id?: string
          narrative_analysis?: Json | null
          ontology_version?: string | null
          prompt_version?: string | null
          raw_signals?: Json | null
          signal_version?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url?: string
          status?: string
          strategic_read?: Json | null
          timing_data?: Json | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_sessions_workspace_id_fkey"
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
      user_profiles: {
        Row: {
          brand_name: string
          competitors: Json | null
          content_topics: string[] | null
          created_at: string | null
          id: string
          niche: string | null
          onboarding_complete: boolean | null
          services: string[] | null
          tone_preference: Database["public"]["Enums"]["tone_pref"]
          updated_at: string | null
        }
        Insert: {
          brand_name: string
          competitors?: Json | null
          content_topics?: string[] | null
          created_at?: string | null
          id: string
          niche?: string | null
          onboarding_complete?: boolean | null
          services?: string[] | null
          tone_preference?: Database["public"]["Enums"]["tone_pref"]
          updated_at?: string | null
        }
        Update: {
          brand_name?: string
          competitors?: Json | null
          content_topics?: string[] | null
          created_at?: string | null
          id?: string
          niche?: string | null
          onboarding_complete?: boolean | null
          services?: string[] | null
          tone_preference?: Database["public"]["Enums"]["tone_pref"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signal_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          signal_card_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          signal_card_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          signal_card_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_signal_interactions_signal_card_id_fkey"
            columns: ["signal_card_id"]
            isOneToOne: false
            referencedRelation: "signal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signal_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      visual_assets: {
        Row: {
          aspect_ratio: string
          composed_url: string | null
          created_at: string
          file_size_bytes: number | null
          generation_group_id: string
          generation_mode: string
          id: string
          intent_input_tokens: number | null
          intent_output_tokens: number | null
          mime_type: string
          original_url: string
          output_id: string | null
          overlay_payload: Json | null
          parent_asset_id: string | null
          primitive_payload: Json | null
          prompt: string
          provider: string
          provider_model: string
          quality_score: number | null
          render_mode: string
          seed: number | null
          status: string
          storage_path: string
          template_id: string | null
          template_payload: Json | null
          variation_reason: string | null
          visual_intent: Json | null
          workspace_id: string
        }
        Insert: {
          aspect_ratio?: string
          composed_url?: string | null
          created_at?: string
          file_size_bytes?: number | null
          generation_group_id: string
          generation_mode?: string
          id?: string
          intent_input_tokens?: number | null
          intent_output_tokens?: number | null
          mime_type?: string
          original_url: string
          output_id?: string | null
          overlay_payload?: Json | null
          parent_asset_id?: string | null
          primitive_payload?: Json | null
          prompt: string
          provider?: string
          provider_model?: string
          quality_score?: number | null
          render_mode?: string
          seed?: number | null
          status?: string
          storage_path: string
          template_id?: string | null
          template_payload?: Json | null
          variation_reason?: string | null
          visual_intent?: Json | null
          workspace_id: string
        }
        Update: {
          aspect_ratio?: string
          composed_url?: string | null
          created_at?: string
          file_size_bytes?: number | null
          generation_group_id?: string
          generation_mode?: string
          id?: string
          intent_input_tokens?: number | null
          intent_output_tokens?: number | null
          mime_type?: string
          original_url?: string
          output_id?: string | null
          overlay_payload?: Json | null
          parent_asset_id?: string | null
          primitive_payload?: Json | null
          prompt?: string
          provider?: string
          provider_model?: string
          quality_score?: number | null
          render_mode?: string
          seed?: number | null
          status?: string
          storage_path?: string
          template_id?: string | null
          template_payload?: Json | null
          variation_reason?: string | null
          visual_intent?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_assets_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "visual_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_generation_sessions: {
        Row: {
          aspect_ratio: string
          audience_frame: string | null
          created_at: string
          emotional_tone: string | null
          generation_mode: string | null
          id: string
          is_active: boolean
          key_idea: string | null
          output_id: string
          parent_session_id: string | null
          quality: string
          version: number
          visual_objective: string | null
          workspace_id: string
        }
        Insert: {
          aspect_ratio?: string
          audience_frame?: string | null
          created_at?: string
          emotional_tone?: string | null
          generation_mode?: string | null
          id?: string
          is_active?: boolean
          key_idea?: string | null
          output_id: string
          parent_session_id?: string | null
          quality?: string
          version?: number
          visual_objective?: string | null
          workspace_id: string
        }
        Update: {
          aspect_ratio?: string
          audience_frame?: string | null
          created_at?: string
          emotional_tone?: string | null
          generation_mode?: string | null
          id?: string
          is_active?: boolean
          key_idea?: string | null
          output_id?: string
          parent_session_id?: string | null
          quality?: string
          version?: number
          visual_objective?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_generation_sessions_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_generation_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "visual_generation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_generation_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_competitor_content: {
        Row: {
          content_id: string
          workspace_id: string
        }
        Insert: {
          content_id: string
          workspace_id: string
        }
        Update: {
          content_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_competitor_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "competitor_content_global"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_competitor_content_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_distribution_settings: {
        Row: {
          updated_at: string
          updated_by: string | null
          utm_settings: Json | null
          workspace_id: string
        }
        Insert: {
          updated_at?: string
          updated_by?: string | null
          utm_settings?: Json | null
          workspace_id: string
        }
        Update: {
          updated_at?: string
          updated_by?: string | null
          utm_settings?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_distribution_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_distribution_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_feed_settings: {
        Row: {
          brand_name: string | null
          competitor_metadata: Json | null
          competitors: string[] | null
          content_topics: string[] | null
          created_at: string | null
          derived_topics: string[] | null
          feed_preferences: Json | null
          knowledge_signals_cache: Json | null
          services: string[] | null
          tone_preference: Database["public"]["Enums"]["tone_pref"]
          updated_at: string | null
          website_feed_cache: Json | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          brand_name?: string | null
          competitor_metadata?: Json | null
          competitors?: string[] | null
          content_topics?: string[] | null
          created_at?: string | null
          derived_topics?: string[] | null
          feed_preferences?: Json | null
          knowledge_signals_cache?: Json | null
          services?: string[] | null
          tone_preference?: Database["public"]["Enums"]["tone_pref"]
          updated_at?: string | null
          website_feed_cache?: Json | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          brand_name?: string | null
          competitor_metadata?: Json | null
          competitors?: string[] | null
          content_topics?: string[] | null
          created_at?: string | null
          derived_topics?: string[] | null
          feed_preferences?: Json | null
          knowledge_signals_cache?: Json | null
          services?: string[] | null
          tone_preference?: Database["public"]["Enums"]["tone_pref"]
          updated_at?: string | null
          website_feed_cache?: Json | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_feed_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_slug_history: {
        Row: {
          changed_at: string
          old_slug: string
          workspace_id: string
        }
        Insert: {
          changed_at?: string
          old_slug: string
          workspace_id: string
        }
        Update: {
          changed_at?: string
          old_slug?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_slug_history_workspace_id_fkey"
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
          avatar_url: string | null
          brand_color: string | null
          created_at: string
          custom_audiences: string[] | null
          deleted_at: string | null
          id: string
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          slug_changed_at: string | null
          updated_at: string
          utm_settings: Json | null
        }
        Insert: {
          assigned_operator_id?: string | null
          avatar_url?: string | null
          brand_color?: string | null
          created_at?: string
          custom_audiences?: string[] | null
          deleted_at?: string | null
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          slug_changed_at?: string | null
          updated_at?: string
          utm_settings?: Json | null
        }
        Update: {
          assigned_operator_id?: string | null
          avatar_url?: string | null
          brand_color?: string | null
          created_at?: string
          custom_audiences?: string[] | null
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug?: string
          slug_changed_at?: string | null
          updated_at?: string
          utm_settings?: Json | null
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
      compute_lens_performance: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      compute_narrative_performance: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      increment_connection_failure: {
        Args: {
          p_connection_id: string
          p_error_message: string
          p_failed_at: string
        }
        Returns: undefined
      }
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
      capture_source: "text" | "voice" | "structured" | "url" | "topic"
      capture_status: "pending" | "processing" | "ready" | "failed"
      channel_platform:
        | "linkedin"
        | "newsletter"
        | "twitter"
        | "wordpress"
        | "shopify"
        | "x"
        | "threads"
        | "facebook"
        | "instagram"
        | "tiktok"
        | "google_business_profile"
        | "bluesky"
      draft_format: "linkedin" | "twitter" | "blog" | "newsletter" | "instagram"
      draft_tone:
        | "authoritative"
        | "conversational"
        | "provocative"
        | "educational"
      feed_tab:
        | "news"
        | "services"
        | "concepts"
        | "competitors"
        | "website"
        | "knowledge"
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
      timing_class: "evergreen" | "publish_now"
      tone_pref: "authoritative" | "conversational" | "provocative"
      tone_val: "positive" | "negative" | "neutral"
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
  graphql_public: {
    Enums: {},
  },
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
      capture_source: ["text", "voice", "structured", "url", "topic"],
      capture_status: ["pending", "processing", "ready", "failed"],
      channel_platform: [
        "linkedin",
        "newsletter",
        "twitter",
        "wordpress",
        "shopify",
        "x",
        "threads",
        "facebook",
        "instagram",
        "tiktok",
        "google_business_profile",
        "bluesky",
      ],
      draft_format: ["linkedin", "twitter", "blog", "newsletter", "instagram"],
      draft_tone: [
        "authoritative",
        "conversational",
        "provocative",
        "educational",
      ],
      feed_tab: [
        "news",
        "services",
        "concepts",
        "competitors",
        "website",
        "knowledge",
      ],
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
      timing_class: ["evergreen", "publish_now"],
      tone_pref: ["authoritative", "conversational", "provocative"],
      tone_val: ["positive", "negative", "neutral"],
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
