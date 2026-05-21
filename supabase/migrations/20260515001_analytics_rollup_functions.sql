-- IMPORTANT: These functions INSERT a new snapshot row per day rather than upsert.
-- This preserves historical intelligence for longitudinal trend analysis.
-- The unique constraint is on (workspace_id, lens_id, computed_for_date) so
-- re-running on the same day is idempotent via ON CONFLICT DO NOTHING.
-- Attribution join uses deterministic UTM campaign prefix (clout_c_) to avoid collisions.

create or replace function compute_lens_performance(p_workspace_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into lens_performance (workspace_id, lens_id, avg_traffic, avg_conversion_rate, computed_for_date, computed_at)
  select
    ca.workspace_id,
    ca.lens_id,
    avg(ae.session_count)                                                    as avg_traffic,
    case when sum(ae.session_count) = 0 then null
         else sum(ae.conversions)::numeric / nullif(sum(ae.session_count), 0)
    end                                                                      as avg_conversion_rate,
    current_date,
    now()
  from content_attribution ca
  join analytics_events ae
    on ae.workspace_id = ca.workspace_id
   and ae.utm_campaign_n = coalesce(ca.utm_campaign, '')
   and ae.utm_content_n  = coalesce(ca.utm_content, '')
  where ca.workspace_id = p_workspace_id
    and ca.lens_id is not null
  group by ca.workspace_id, ca.lens_id
  on conflict (workspace_id, lens_id, computed_for_date) do nothing;
end;
$$;

create or replace function compute_narrative_performance(p_workspace_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into narrative_performance (workspace_id, narrative_type, avg_engagement_rate, avg_conversion_rate, avg_session_duration, sample_size, computed_for_date, computed_at)
  select
    ca.workspace_id,
    ca.narrative_type,
    case when sum(ae.session_count) = 0 then null
         else sum(ae.engaged_sessions)::numeric / nullif(sum(ae.session_count), 0)
    end                                                                       as avg_engagement_rate,
    case when sum(ae.session_count) = 0 then null
         else sum(ae.conversions)::numeric / nullif(sum(ae.session_count), 0)
    end                                                                       as avg_conversion_rate,
    avg(ae.avg_engagement_time)                                               as avg_session_duration,
    count(distinct ca.output_id)                                              as sample_size,
    current_date,
    now()
  from content_attribution ca
  join analytics_events ae
    on ae.workspace_id = ca.workspace_id
   and ae.utm_campaign_n = coalesce(ca.utm_campaign, '')
   and ae.utm_content_n  = coalesce(ca.utm_content, '')
  where ca.workspace_id = p_workspace_id
    and ca.narrative_type is not null
  group by ca.workspace_id, ca.narrative_type
  on conflict (workspace_id, narrative_type, computed_for_date) do nothing;
end;
$$;
