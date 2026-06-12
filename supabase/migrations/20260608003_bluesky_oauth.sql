-- Transient OAuth state (10-min TTL during connect flow)
-- Implements NodeOAuthClient stateStore interface
CREATE TABLE bluesky_oauth_states (
  key        text        PRIMARY KEY,
  state_data jsonb       NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX idx_bluesky_oauth_states_expires_at
  ON bluesky_oauth_states(expires_at);

-- Persistent DPoP-bound sessions (keyed by DID)
-- Implements NodeOAuthClient sessionStore interface
CREATE TABLE bluesky_oauth_sessions (
  sub          text        PRIMARY KEY,  -- DID, e.g. did:plc:xxx
  session_data jsonb       NOT NULL,
  channel_id   uuid        REFERENCES channels(id) ON DELETE CASCADE,
  workspace_id uuid        REFERENCES workspaces(id) ON DELETE CASCADE,
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX idx_bluesky_oauth_sessions_workspace_id
  ON bluesky_oauth_sessions(workspace_id);
