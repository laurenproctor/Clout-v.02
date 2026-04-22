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
          display_name: string | null
          first_name: string | null
          last_name: string | null
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
          first_session_dismissed_at: string | null
          private_feed_operator_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          display_name?: string | null
          first_name?: string | null
          last_name?: string | null
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
          first_session_dismissed_at?: string | null
          private_feed_operator_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          first_name?: string | null
          last_name?: string | null
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
          first_session_dismissed_at?: string | null
          private_feed_operator_visible?: boolean
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
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by: string
          source: 'text' | 'voice' | 'structured' | 'url'
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
          generation_id: string
          channel_id: string | null
          status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
          title: string | null
          content: Json
          approved_by: string | null
          approved_at: string | null
          provider_post_id: string | null
          published_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          generation_id: string
          channel_id?: string | null
          status?: 'draft' | 'review' | 'approved' | 'published' | 'archived'
          title?: string | null
          content?: Json
          approved_by?: string | null
          approved_at?: string | null
          provider_post_id?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          channel_id?: string | null
          status?: 'draft' | 'review' | 'approved' | 'published' | 'archived'
          title?: string | null
          content?: Json
          approved_by?: string | null
          approved_at?: string | null
          provider_post_id?: string | null
          published_at?: string | null
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
          platform: 'linkedin' | 'newsletter' | 'twitter'
          label: string | null
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          platform: 'linkedin' | 'newsletter' | 'twitter'
          label?: string | null
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          label?: string | null
          config?: Json
          is_active?: boolean
          updated_at?: string
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
      output_status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
      channel_platform: 'linkedin' | 'newsletter' | 'twitter'
      lens_scope: 'system' | 'workspace'
      job_type: 'transcribe' | 'generate' | 'summarize' | 'reformat'
      job_status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
    }
  }
}
