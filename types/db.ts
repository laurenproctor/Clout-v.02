// Full Supabase Database interface — Row / Insert / Update for all 14 tables

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'enterprise'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'free' | 'pro' | 'enterprise'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
        }
      }
      workspace_invitations: {
        Row: {
          id: string
          workspace_id: string
          invited_by_user_id: string
          email: string
          role: 'owner' | 'admin' | 'member'
          token: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          invited_by_user_id: string
          email: string
          role?: 'owner' | 'admin' | 'member'
          token: string
          accepted_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          updated_at?: string
        }
      }
      captures: {
        Row: {
          id: string
          workspace_id: string
          created_by_user_id: string
          title: string
          raw_content: string
          summary: string | null
          tags: string[]
          status: 'draft' | 'processing' | 'ready' | 'failed'
          source_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by_user_id: string
          title: string
          raw_content: string
          summary?: string | null
          tags?: string[]
          status?: 'draft' | 'processing' | 'ready' | 'failed'
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          raw_content?: string
          summary?: string | null
          tags?: string[]
          status?: 'draft' | 'processing' | 'ready' | 'failed'
          source_url?: string | null
          updated_at?: string
        }
      }
      capture_embeddings: {
        Row: {
          id: string
          capture_id: string
          embedding: number[]
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          capture_id: string
          embedding: number[]
          model: string
          created_at?: string
        }
        Update: {
          embedding?: number[]
          model?: string
        }
      }
      lenses: {
        Row: {
          id: string
          workspace_id: string
          created_by_user_id: string
          name: string
          description: string | null
          system_prompt: string
          visibility: 'private' | 'workspace' | 'public'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by_user_id: string
          name: string
          description?: string | null
          system_prompt: string
          visibility?: 'private' | 'workspace' | 'public'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          system_prompt?: string
          visibility?: 'private' | 'workspace' | 'public'
          updated_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          workspace_id: string
          capture_id: string
          lens_id: string
          triggered_by_user_id: string
          status: 'queued' | 'running' | 'completed' | 'failed'
          output_format: 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
          raw_prompt: string | null
          raw_response: string | null
          quality_score: number | null
          quality_feedback: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          capture_id: string
          lens_id: string
          triggered_by_user_id: string
          status?: 'queued' | 'running' | 'completed' | 'failed'
          output_format: 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
          raw_prompt?: string | null
          raw_response?: string | null
          quality_score?: number | null
          quality_feedback?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: 'queued' | 'running' | 'completed' | 'failed'
          raw_prompt?: string | null
          raw_response?: string | null
          quality_score?: number | null
          quality_feedback?: string | null
          completed_at?: string | null
        }
      }
      outputs: {
        Row: {
          id: string
          generation_id: string
          workspace_id: string
          format: 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
          content: string
          metadata: Record<string, unknown>
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          generation_id: string
          workspace_id: string
          format: 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
          content: string
          metadata?: Record<string, unknown>
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          metadata?: Record<string, unknown>
          published_at?: string | null
          updated_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          workspace_id: string
          created_by_user_id: string
          platform: string
          name: string
          credentials_encrypted: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          created_by_user_id: string
          platform: string
          name: string
          credentials_encrypted?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          credentials_encrypted?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      scheduled_posts: {
        Row: {
          id: string
          output_id: string
          channel_id: string
          workspace_id: string
          scheduled_for: string
          posted_at: string | null
          status: 'pending' | 'posted' | 'failed' | 'cancelled'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          output_id: string
          channel_id: string
          workspace_id: string
          scheduled_for: string
          posted_at?: string | null
          status?: 'pending' | 'posted' | 'failed' | 'cancelled'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          scheduled_for?: string
          posted_at?: string | null
          status?: 'pending' | 'posted' | 'failed' | 'cancelled'
          error_message?: string | null
          updated_at?: string
        }
      }
      usage_ledger: {
        Row: {
          id: string
          workspace_id: string
          period_start: string
          period_end: string
          generations_used: number
          generations_limit: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          period_start: string
          period_end: string
          generations_used?: number
          generations_limit: number
          created_at?: string
        }
        Update: {
          generations_used?: number
          generations_limit?: number
        }
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string
          actor_user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          actor_user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Record<string, never>
      }
      webhook_events: {
        Row: {
          id: string
          source: 'clerk' | 'stripe'
          event_type: string
          payload: Record<string, unknown>
          processed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source: 'clerk' | 'stripe'
          event_type: string
          payload: Record<string, unknown>
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          processed_at?: string | null
          error_message?: string | null
        }
      }
    }
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
    Enums: {
      workspace_plan: 'free' | 'pro' | 'enterprise'
      workspace_role: 'owner' | 'admin' | 'member'
      capture_status: 'draft' | 'processing' | 'ready' | 'failed'
      lens_visibility: 'private' | 'workspace' | 'public'
      generation_status: 'queued' | 'running' | 'completed' | 'failed'
      output_format: 'tweet' | 'thread' | 'linkedin' | 'newsletter' | 'blog' | 'email'
    }
  }
}
