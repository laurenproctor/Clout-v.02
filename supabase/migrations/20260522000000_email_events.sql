-- email_events: tracks transactional email dispatch with idempotency
-- Used by lib/trigger/jobs/dispatch-email.ts and lib/email/send.ts

CREATE TABLE IF NOT EXISTS email_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key    text        NOT NULL UNIQUE,
  type               text        NOT NULL,
  recipient_email    text        NOT NULL,
  user_id            uuid        REFERENCES users(id) ON DELETE SET NULL,
  workspace_id       uuid        REFERENCES workspaces(id) ON DELETE SET NULL,
  payload            jsonb,
  status             text        NOT NULL DEFAULT 'pending',
  attempt_count      integer     NOT NULL DEFAULT 0,
  last_attempted_at  timestamptz,
  resend_id          text,
  sent_at            timestamptz,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_user_id_idx        ON email_events(user_id);
CREATE INDEX IF NOT EXISTS email_events_workspace_id_idx   ON email_events(workspace_id);
CREATE INDEX IF NOT EXISTS email_events_status_idx         ON email_events(status);
CREATE INDEX IF NOT EXISTS email_events_created_at_idx     ON email_events(created_at DESC);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read email events (operator dashboard)
CREATE POLICY "super_admin_read_email_events"
  ON email_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.operator_role = 'super_admin'
    )
  );
