// Database row types — mirrors supabase/schema.sql exactly
// Regenerate with: npx supabase gen types typescript --project-id <id>

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          operator_role: 'super_admin' | 'agency_operator' | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          operator_role?: 'super_admin' | 'agency_operator' | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          operator_role?: 'super_admin' | 'agency_operator' | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'business' | 'enterprise'
          assigned_operator_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'free' | 'pro' | 'business' | 'enterprise'
          assigned_operator_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          slug?: string
          plan?: 'free' | 'pro' | 'business' | 'enterprise'
          assigned_operator_id?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          workspace_id: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          bio: string | null
          industries: string[]
          target_audiences: string[]
          tone_notes: string | null
          mental_models: Json
          philosophies: Json
          sample_content: string[]
          purpose: string | null
          role: string | null
          industry: string | null
          expertise: string | null
          profile_insights: Json | null
          channels: string[]
          audience_targets: string[]
          audience_perception: string[]
          onboarding_completed_at: string | null
          private_feed_operator_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          bio?: string | null
          industries?: string[]
          target_audiences?: string[]
          tone_notes?: string | null
          mental_models?: Json
          philosophies?: Json
          sample_content?: string[]
          purpose?: string | null
          role?: string | null
          industry?: string | null
          expertise?: string | null
          profile_insights?: Json | null
          channels?: string[]
          audience_targets?: string[]
          audience_perception?: string[]
          onboarding_completed_at?: string | null
          private_feed_operator_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          bio?: string | null
          industries?: string[]
          target_audiences?: string[]
          tone_notes?: string | null
          mental_models?: Json
          philosophies?: Json
          sample_content?: string[]
          purpose?: string | null
          role?: string | null
          industry?: string | null
          expertise?: string | null
          profile_insights?: Json | null
          channels?: string[]
          audience_targets?: string[]
          audience_perception?: string[]
          onboarding_completed_at?: string | null
          private_feed_operator_visible?: boolean
          first_session_dismissed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: 'free' | 'pro' | 'business' | 'enterprise'
          status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
          entitlements: Json
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'business' | 'enterprise'
          status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
          entitlements?: Json
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'business' | 'enterprise'
          status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
          entitlements?: Json
          current_period_start?: string | null
          current_period_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lenses: {
        Row: {
          id: string
          workspace_id: string | null
          created_by: string | null
          scope: 'system' | 'workspace'
          name: string
          description: string | null
          system_prompt: string
          tags: string[]
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          created_by?: string | null
          scope?: 'system' | 'workspace'
          name: string
          description?: string | null
          system_prompt: string
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          system_prompt?: string
          tags?: string[]
          is_active?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      captures: {
        Row: {
          id: string
          workspace_id: string
          created_by: string
          source: 'text' | 'voice' | 'structured' | 'url'
          status: 'pending' | 'processing' | 'ready' | 'failed'
          raw_content: string | null
          source_url: string | null
          structured_data: Json | null
          audio_path: string | null
          transcript: string | null
          notes: string | null
          is_private: boolean
          tags: string[]
          research_sources: Json | null
          research_summary: string | null
          extracted_angles: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by: string
          source: 'text' | 'voice' | 'structured' | 'url' | 'topic'
          status?: 'pending' | 'processing' | 'ready' | 'failed'
          raw_content?: string | null
          source_url?: string | null
          structured_data?: Json | null
          audio_path?: string | null
          transcript?: string | null
          notes?: string | null
          is_private?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          status?: 'pending' | 'processing' | 'ready' | 'failed'
          raw_content?: string | null
          source_url?: string | null
          structured_data?: Json | null
          transcript?: string | null
          notes?: string | null
          is_private?: boolean
          tags?: string[]
          research_sources?: Json | null
          research_summary?: string | null
          extracted_angles?: Json | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      generations: {
        Row: {
          id: string
          workspace_id: string
          capture_id: string
          lens_id: string
          profile_id: string
          status: 'pending' | 'generating' | 'complete' | 'failed'
          model: string
          prompt_snapshot: string | null
          raw_response: string | null
          error_message: string | null
          duration_ms: number | null
          token_count: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          capture_id: string
          lens_id: string
          profile_id: string
          status?: 'pending' | 'generating' | 'complete' | 'failed'
          model: string
          prompt_snapshot?: string | null
          raw_response?: string | null
          error_message?: string | null
          duration_ms?: number | null
          token_count?: number | null
          generation_group_id?: string | null
          angle_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: 'pending' | 'generating' | 'complete' | 'failed'
          prompt_snapshot?: string | null
          raw_response?: string | null
          error_message?: string | null
          duration_ms?: number | null
          token_count?: number | null
          completed_at?: string | null
        }
        Relationships: []
      }
      outputs: {
        Row: {
          id: string
          workspace_id: string
          generation_id: string | null
          channel_id: string | null
          generation_group_id: string | null
          status: 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
          content_type: string | null
          title: string | null
          content: Json
          approved_by: string | null
          approved_at: string | null
          provider_post_id:  string | null
          provider_post_url: string | null
          published_at: string | null
          scheduled_at: string | null
          last_publish_error: string | null
          approved_for_week: boolean
          week_bucket: string | null
          performance_snapshot: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          generation_id?: string | null
          channel_id?: string | null
          generation_group_id?: string | null
          status?: 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
          content_type?: string | null
          title?: string | null
          content?: Json
          approved_by?: string | null
          approved_at?: string | null
          provider_post_id?: string | null
          provider_post_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          last_publish_error?: string | null
          approved_for_week?: boolean
          week_bucket?: string | null
          performance_snapshot?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          channel_id?: string | null
          status?: 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
          content_type?: string | null
          title?: string | null
          content?: Json
          approved_by?: string | null
          approved_at?: string | null
          provider_post_id?: string | null
          provider_post_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          last_publish_error?: string | null
          approved_for_week?: boolean
          week_bucket?: string | null
          performance_snapshot?: Json | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      output_versions: {
        Row: {
          id: string
          output_id: string
          version_number: number
          content: Json
          change_summary: string | null
          edited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          output_id: string
          version_number: number
          content: Json
          change_summary?: string | null
          edited_by?: string | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      onboarding_generations: {
        Row: {
          id: string
          workspace_id: string
          positioning: string | null
          post_ideas: Json
          draft_post: string | null
          status: 'pending' | 'complete' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          positioning?: string | null
          post_ideas?: Json
          draft_post?: string | null
          status?: 'pending' | 'complete' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          positioning?: string | null
          post_ideas?: Json
          draft_post?: string | null
          status?: 'pending' | 'complete' | 'failed'
          created_at?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          id: string
          workspace_id: string
          platform: 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile'
          label: string | null
          config: Json
          is_active: boolean
          account_id: string | null
          account_type: string
          created_at: string
          updated_at: string
          profile_image_url: string | null
          google_location_name: string | null
          google_location_numeric_id: string | null
          google_account_id: string | null
          google_location_address: Json | null
          google_verified: boolean | null
          google_profile_photo_url: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile'
          label?: string | null
          config?: Json
          is_active?: boolean
          account_id?: string | null
          account_type?: string
          created_at?: string
          updated_at?: string
          profile_image_url?: string | null
          google_location_name?: string | null
          google_location_numeric_id?: string | null
          google_account_id?: string | null
          google_location_address?: Json | null
          google_verified?: boolean | null
          google_profile_photo_url?: string | null
        }
        Update: {
          label?: string | null
          config?: Json
          is_active?: boolean
          account_id?: string | null
          account_type?: string
          updated_at?: string
          profile_image_url?: string | null
          google_location_name?: string | null
          google_location_numeric_id?: string | null
          google_account_id?: string | null
          google_location_address?: Json | null
          google_verified?: boolean | null
          google_profile_photo_url?: string | null
        }
        Relationships: []
      }
      private_enrichments: {
        Row: {
          id: string
          capture_id: string
          workspace_id: string
          lens_id: string | null
          content: string
          insights: Json
          model: string
          prompt_snapshot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          capture_id: string
          workspace_id: string
          lens_id?: string | null
          content: string
          insights?: Json
          model: string
          prompt_snapshot?: string | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          workspace_id: string
          type: 'transcribe' | 'generate' | 'summarize' | 'reformat'
          status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
          resource_type: string
          resource_id: string
          payload: Json
          result: Json | null
          error_message: string | null
          attempts: number
          max_attempts: number
          scheduled_at: string
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          type: 'transcribe' | 'generate' | 'summarize' | 'reformat'
          status?: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
          resource_type: string
          resource_id: string
          payload?: Json
          result?: Json | null
          error_message?: string | null
          attempts?: number
          max_attempts?: number
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
          result?: Json | null
          error_message?: string | null
          attempts?: number
          started_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          event_type: 'capture_created' | 'generation_run' | 'output_published' | 'lens_applied' | 'voice_transcribed' | 'member_invited'
          resource_type: string | null
          resource_id: string | null
          quantity: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          event_type: 'capture_created' | 'generation_run' | 'output_published' | 'lens_applied' | 'voice_transcribed' | 'member_invited'
          resource_type?: string | null
          resource_id?: string | null
          quantity?: number
          metadata?: Json
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      email_events: {
        Row: {
          id: string
          idempotency_key: string
          type: 'welcome' | 'output_ready' | 'payment_failed'
          recipient_email: string
          user_id: string | null
          workspace_id: string | null
          payload: Json | null
          status: 'pending' | 'sent' | 'failed'
          resend_id: string | null
          error: string | null
          attempt_count: number
          last_attempted_at: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          idempotency_key: string
          type: 'welcome' | 'output_ready' | 'payment_failed'
          recipient_email: string
          user_id?: string | null
          workspace_id?: string | null
          payload?: Json | null
          status?: 'pending' | 'sent' | 'failed'
          resend_id?: string | null
          error?: string | null
          attempt_count?: number
          last_attempted_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed'
          resend_id?: string | null
          error?: string | null
          attempt_count?: number
          last_attempted_at?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string | null
          actor_id: string | null
          action: 'create' | 'update' | 'delete' | 'publish' | 'approve' | 'assign' | 'restore' | 'soft_delete'
          resource_type: string
          resource_id: string | null
          before_state: Json | null
          after_state: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          actor_id?: string | null
          action: 'create' | 'update' | 'delete' | 'publish' | 'approve' | 'assign' | 'restore' | 'soft_delete'
          resource_type: string
          resource_id?: string | null
          before_state?: Json | null
          after_state?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      channel_credentials: {
        Row: {
          id: string
          channel_id: string
          workspace_id: string
          access_token: string
          refresh_token: string | null
          expires_at: number | null
          account_id: string | null
          account_name: string | null
          account_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          workspace_id: string
          access_token: string
          refresh_token?: string | null
          expires_at?: number | null
          account_id?: string | null
          account_name?: string | null
          account_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          workspace_id?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: number | null
          account_id?: string | null
          account_name?: string | null
          account_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_health_logs: {
        Row: {
          id: string
          workspace_id: string
          channel_id: string | null
          platform: string
          event_type: string
          error_code: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          channel_id?: string | null
          platform: string
          event_type: string
          error_code?: string | null
          error_message?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      publish_logs: {
        Row: {
          id: string
          workspace_id: string
          output_id: string
          channel_id: string | null
          platform: string
          status: 'success' | 'failed'
          provider_post_id: string | null
          error_code: string | null
          error_message: string | null
          was_retry: boolean
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          output_id: string
          channel_id?: string | null
          platform: string
          status: 'success' | 'failed'
          provider_post_id?: string | null
          error_code?: string | null
          error_message?: string | null
          was_retry?: boolean
          duration_ms?: number | null
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      scheduling_preferences: {
        Row: {
          id: string
          workspace_id: string
          posts_per_week: number
          preferred_days: number[]
          preferred_times: string[]
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          posts_per_week?: number
          preferred_days?: number[]
          preferred_times?: string[]
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          posts_per_week?: number
          preferred_days?: number[]
          preferred_times?: string[]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          id: string
          workspace_id: string
          brand_name: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          accent_color: string
          font_heading: string
          font_body: string
          font_heading_url: string | null
          font_body_url: string | null
          tone_traits: string[]
          style_traits: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          brand_name?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          font_heading?: string
          font_body?: string
          font_heading_url?: string | null
          font_body_url?: string | null
          tone_traits?: string[]
          style_traits?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          font_heading?: string
          font_body?: string
          font_heading_url?: string | null
          font_body_url?: string | null
          tone_traits?: string[]
          style_traits?: Json
          updated_at?: string
        }
        Relationships: []
      }
      brand_imagery_profiles: {
        Row: {
          id: string
          workspace_id: string
          visual_styles: string[]
          imagery_type: string | null
          composition: string | null
          overlay_text_style: string | null
          mood_traits: string[]
          negative_rules: string[]
          example_board: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          visual_styles?: string[]
          imagery_type?: string | null
          composition?: string | null
          overlay_text_style?: string | null
          mood_traits?: string[]
          negative_rules?: string[]
          example_board?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          visual_styles?: string[]
          imagery_type?: string | null
          composition?: string | null
          overlay_text_style?: string | null
          mood_traits?: string[]
          negative_rules?: string[]
          example_board?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      visual_assets: {
        Row: {
          id: string
          workspace_id: string
          output_id: string | null
          parent_asset_id: string | null
          generation_group_id: string
          variation_reason: string | null
          provider: string
          provider_model: string
          original_url: string
          storage_path: string
          prompt: string
          visual_intent: Json | null
          generation_mode: string
          render_mode: string
          aspect_ratio: string
          mime_type: string
          file_size_bytes: number | null
          seed: number | null
          status: string
          primitive_payload: Json | null
          overlay_payload: Json | null
          intent_input_tokens: number | null
          intent_output_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          output_id?: string | null
          parent_asset_id?: string | null
          generation_group_id: string
          variation_reason?: string | null
          provider?: string
          provider_model?: string
          original_url: string
          storage_path: string
          prompt: string
          visual_intent?: Json | null
          generation_mode?: string
          render_mode?: string
          aspect_ratio?: string
          mime_type?: string
          file_size_bytes?: number | null
          seed?: number | null
          status?: string
          primitive_payload?: Json | null
          overlay_payload?: Json | null
          intent_input_tokens?: number | null
          intent_output_tokens?: number | null
          created_at?: string
        }
        Update: {
          status?: string
          output_id?: string | null
          overlay_payload?: Json | null
          primitive_payload?: Json | null
        }
        Relationships: []
      }
      assistant_sessions: {
        Row: {
          id: string
          workspace_id: string
          capture_id: string | null
          user_id: string | null
          status: string
          metadata: Json
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          capture_id?: string | null
          user_id?: string | null
          status?: string
          metadata?: Record<string, unknown>
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: string
          metadata?: Record<string, unknown>
          completed_at?: string | null
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          id: string
          session_id: string
          workspace_id: string
          role: string
          content: string
          model: string | null
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          workspace_id: string
          role: string
          content: string
          model?: string | null
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          content?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      assistant_generations: {
        Row: {
          id: string
          session_id: string
          workspace_id: string
          output_id: string | null
          parent_generation_id: string | null
          status: string
          inferred_intent: Json | null
          output_format: string | null
          provider: string | null
          model: string | null
          prompt_version: string | null
          generation_config: Json | null
          retry_count: number
          failure_reason: string | null
          latency_ms: number | null
          tokens_input: number | null
          tokens_output: number | null
          stream_state: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          workspace_id: string
          output_id?: string | null
          parent_generation_id?: string | null
          status?: string
          inferred_intent?: Json | null
          output_format?: string | null
          provider?: string | null
          model?: string | null
          prompt_version?: string | null
          generation_config?: Json | null
          retry_count?: number
          failure_reason?: string | null
          latency_ms?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          stream_state?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: string
          failure_reason?: string | null
          latency_ms?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          stream_state?: string | null
          completed_at?: string | null
          output_id?: string | null
        }
        Relationships: []
      }
      assistant_events: {
        Row: {
          id: string
          workspace_id: string
          session_id: string | null
          generation_id: string | null
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          session_id?: string | null
          generation_id?: string | null
          event_type: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      // ── GDELT Signal Feed ────────────────────────────────────────────────────
      signals: {
        Row: {
          id: string
          external_id: string | null
          source: string
          title: string
          summary: string | null
          source_url: string | null
          published_at: string | null
          tone: 'positive' | 'negative' | 'neutral'
          gdelt_raw_score: number | null
          coverage_48h_pct: number | null
          first_seen_at: string
          refreshed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          source?: string
          title: string
          summary?: string | null
          source_url?: string | null
          published_at?: string | null
          tone?: 'positive' | 'negative' | 'neutral'
          gdelt_raw_score?: number | null
          coverage_48h_pct?: number | null
          first_seen_at?: string
          refreshed_at?: string | null
          created_at?: string
        }
        Update: {
          summary?: string | null
          source_url?: string | null
          tone?: 'positive' | 'negative' | 'neutral'
          gdelt_raw_score?: number | null
          coverage_48h_pct?: number | null
          refreshed_at?: string | null
        }
        Relationships: []
      }
      signal_cards: {
        Row: {
          id: string
          signal_id: string | null
          tab: 'news' | 'services' | 'concepts' | 'competitors'
          title: string
          tone: 'positive' | 'negative' | 'neutral'
          momentum_pct: string | null
          momentum_bar_width: number
          tags: string[]
          gdelt_score: number | null
          gdelt_score_label: string | null
          is_trending: boolean
          concept_surfaced_via: string | null
          why_now: string | null
          matched_service: string | null
          timing_classification: 'evergreen' | 'publish_now' | null
          competitor_id: string | null
          opportunity_tier: number | null
          created_at: string
          refreshed_at: string | null
        }
        Insert: {
          id?: string
          signal_id?: string | null
          tab: 'news' | 'services' | 'concepts' | 'competitors'
          title: string
          tone?: 'positive' | 'negative' | 'neutral'
          momentum_pct?: string | null
          momentum_bar_width?: number
          tags?: string[]
          gdelt_score?: number | null
          gdelt_score_label?: string | null
          is_trending?: boolean
          concept_surfaced_via?: string | null
          why_now?: string | null
          matched_service?: string | null
          timing_classification?: 'evergreen' | 'publish_now' | null
          competitor_id?: string | null
          opportunity_tier?: number | null
          created_at?: string
          refreshed_at?: string | null
        }
        Update: {
          tab?: 'news' | 'services' | 'concepts' | 'competitors'
          title?: string
          tone?: 'positive' | 'negative' | 'neutral'
          momentum_pct?: string | null
          momentum_bar_width?: number
          tags?: string[]
          gdelt_score?: number | null
          gdelt_score_label?: string | null
          is_trending?: boolean
          concept_surfaced_via?: string | null
          why_now?: string | null
          matched_service?: string | null
          timing_classification?: 'evergreen' | 'publish_now' | null
          competitor_id?: string | null
          opportunity_tier?: number | null
          refreshed_at?: string | null
        }
        Relationships: []
      }
      signal_entities: {
        Row: {
          id: string
          signal_id: string
          entity_name: string
          entity_type: string
          entity_role: string
          confidence: number
        }
        Insert: {
          id?: string
          signal_id: string
          entity_name: string
          entity_type: string
          entity_role?: string
          confidence?: number
        }
        Update: {
          entity_name?: string
          entity_type?: string
          entity_role?: string
          confidence?: number
        }
        Relationships: []
      }
      signal_relationships: {
        Row: {
          id: string
          entity_a: string
          entity_b: string
          relationship: 'co_occurs' | 'adjacent' | 'precedes'
          signal_count: number
          strength: number
          first_seen: string
          last_seen: string
        }
        Insert: {
          id?: string
          entity_a: string
          entity_b: string
          relationship: 'co_occurs' | 'adjacent' | 'precedes'
          signal_count?: number
          strength?: number
          first_seen?: string
          last_seen?: string
        }
        Update: {
          signal_count?: number
          strength?: number
          last_seen?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          brand_name: string
          niche: string | null
          services: string[]
          tone_preference: 'authoritative' | 'conversational' | 'provocative'
          competitors: Json
          content_topics: string[]
          onboarding_complete: boolean
          updated_at: string
        }
        Insert: {
          id: string
          brand_name?: string
          niche?: string | null
          services?: string[]
          tone_preference?: 'authoritative' | 'conversational' | 'provocative'
          competitors?: Json
          content_topics?: string[]
          onboarding_complete?: boolean
          updated_at?: string
        }
        Update: {
          brand_name?: string
          niche?: string | null
          services?: string[]
          tone_preference?: 'authoritative' | 'conversational' | 'provocative'
          competitors?: Json
          content_topics?: string[]
          onboarding_complete?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      competitor_entities: {
        Row: {
          id: string
          workspace_id: string
          name: string
          handle: string | null
          domain: string | null
          gdelt_entity_id: string | null
          platforms: string[]
          added_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          handle?: string | null
          domain?: string | null
          gdelt_entity_id?: string | null
          platforms?: string[]
          added_at?: string
        }
        Update: {
          name?: string
          handle?: string | null
          domain?: string | null
          gdelt_entity_id?: string | null
          platforms?: string[]
        }
        Relationships: []
      }
      competitor_mentions: {
        Row: {
          id: string
          competitor_id: string
          card_id: string | null
          signal_id: string | null
          headline: string
          published_at: string | null
          platform: string | null
          has_coverage: boolean
          tone: 'positive' | 'negative' | 'neutral' | null
          angle_summary: string | null
          fetched_at: string
        }
        Insert: {
          id?: string
          competitor_id: string
          card_id?: string | null
          signal_id?: string | null
          headline: string
          published_at?: string | null
          platform?: string | null
          has_coverage?: boolean
          tone?: 'positive' | 'negative' | 'neutral' | null
          angle_summary?: string | null
          fetched_at?: string
        }
        Update: {
          headline?: string
          published_at?: string | null
          platform?: string | null
          has_coverage?: boolean
          tone?: 'positive' | 'negative' | 'neutral' | null
          angle_summary?: string | null
        }
        Relationships: []
      }
      user_signal_interactions: {
        Row: {
          id: string
          user_id: string
          signal_card_id: string
          interaction_type: string
          interaction_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          signal_card_id: string
          interaction_type: string
          interaction_data?: Json
          created_at?: string
        }
        Update: never
        Relationships: []
      }
      draft_cache: {
        Row: {
          id: string
          card_id: string
          user_id: string
          format: 'linkedin' | 'twitter' | 'blog' | 'newsletter' | 'instagram'
          tone: 'authoritative' | 'conversational' | 'provocative' | 'educational'
          content: string
          model_id: string
          prompt_version: string
          system_prompt_hash: string | null
          invalidated_at: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          format: 'linkedin' | 'twitter' | 'blog' | 'newsletter' | 'instagram'
          tone: 'authoritative' | 'conversational' | 'provocative' | 'educational'
          content: string
          model_id?: string
          prompt_version?: string
          system_prompt_hash?: string | null
          invalidated_at?: string | null
          generated_at?: string
        }
        Update: {
          content?: string
          model_id?: string
          prompt_version?: string
          system_prompt_hash?: string | null
          invalidated_at?: string | null
        }
        Relationships: []
      }
      concept_clusters: {
        Row: {
          id: string
          cluster_name: string
          description: string | null
          entity_identifiers: string[]
          status: 'emerging' | 'rising' | 'peaking' | 'declining'
          whitespace_score: number | null
          coverage_velocity: number | null
          first_emerged_at: string | null
          peak_estimated_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          cluster_name: string
          description?: string | null
          entity_identifiers?: string[]
          status?: 'emerging' | 'rising' | 'peaking' | 'declining'
          whitespace_score?: number | null
          coverage_velocity?: number | null
          first_emerged_at?: string | null
          peak_estimated_at?: string | null
          updated_at?: string
        }
        Update: {
          cluster_name?: string
          description?: string | null
          entity_identifiers?: string[]
          status?: 'emerging' | 'rising' | 'peaking' | 'declining'
          whitespace_score?: number | null
          coverage_velocity?: number | null
          first_emerged_at?: string | null
          peak_estimated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      workspace_role: 'owner' | 'admin' | 'editor' | 'viewer'
      operator_role: 'super_admin' | 'agency_operator'
      subscription_plan: 'free' | 'pro' | 'business' | 'enterprise'
      subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
      capture_source: 'text' | 'voice' | 'structured' | 'url'
      capture_status: 'pending' | 'processing' | 'ready' | 'failed'
      generation_status: 'pending' | 'generating' | 'complete' | 'failed'
      output_status: 'draft' | 'review' | 'approved' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'
      channel_platform: 'linkedin' | 'newsletter' | 'x' | 'twitter' | 'threads' | 'facebook' | 'instagram' | 'tiktok' | 'wordpress' | 'shopify' | 'google_business_profile'
      lens_scope: 'system' | 'workspace'
      job_type: 'transcribe' | 'generate' | 'summarize' | 'reformat'
      job_status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
      email_type: 'welcome' | 'output_ready' | 'payment_failed'
      email_status: 'pending' | 'sent' | 'failed'
    }
  }
}
