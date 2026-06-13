-- Substack publishing bridge: links an output to a publishing_connections row
-- (the destination) and records the user's explicit Substack publish intent.
-- The presence of publishing_connection_id — not the content type — is what routes
-- an output through the publishing-layer executor (lib/publishing/executor.ts).

-- 1. Destination: which Substack (or other publishing-layer) publication this output targets.
alter table outputs
  add column if not exists publishing_connection_id uuid
    references publishing_connections(id) on delete set null;

create index if not exists outputs_workspace_publishing_connection_idx
  on outputs(workspace_id, publishing_connection_id);

-- 2. Source of truth for the scheduler: the user's explicit Substack intent, set before
-- an output can be scheduled. The scheduler reads this BEFORE any publish attempt exists
-- (published_content.metadata only exists post-attempt). The scheduler never reinterprets
-- one intent as another — a draft is not a publish, a publish is not an email.
alter table outputs
  add column if not exists publish_intent text
    check (publish_intent in (
      'substack_newsletter_draft',
      'substack_note_publish',
      'substack_newsletter_publish_web',
      'substack_newsletter_send_email'
    ));
