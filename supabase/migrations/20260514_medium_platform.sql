-- Medium platform: content lineage columns
-- Adds graph-ready derivation fields to outputs and published_content.
-- Multi-parent ready: sourceContentIds supports assemblies from multiple sources.
-- sourcePlatform is open string — lineage outlives providers and platform availability.

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS source_content_ids          TEXT[],
  ADD COLUMN IF NOT EXISTS primary_source_content_id   TEXT,
  ADD COLUMN IF NOT EXISTS derivation_type             TEXT
    CHECK (derivation_type IN ('expansion','compression','teaser','thread','newsletter','translation')),
  ADD COLUMN IF NOT EXISTS source_platform             TEXT;

ALTER TABLE published_content
  ADD COLUMN IF NOT EXISTS source_content_ids          TEXT[],
  ADD COLUMN IF NOT EXISTS primary_source_content_id   TEXT,
  ADD COLUMN IF NOT EXISTS derivation_type             TEXT
    CHECK (derivation_type IN ('expansion','compression','teaser','thread','newsletter','translation')),
  ADD COLUMN IF NOT EXISTS source_platform             TEXT;

-- No enum changes needed:
-- publishing_connections.provider is TEXT (not a Postgres enum)
-- channel_platform enum is unchanged (Medium uses publishing_connections, not channels)

COMMENT ON COLUMN outputs.source_content_ids        IS 'Multi-parent lineage — content IDs this output was derived from';
COMMENT ON COLUMN outputs.primary_source_content_id IS 'Primary parent for linear traversal when multi-parent derivation is present';
COMMENT ON COLUMN outputs.derivation_type           IS 'Semantic derivation class: expansion, compression, teaser, thread, newsletter, translation';
COMMENT ON COLUMN outputs.source_platform           IS 'Platform the source content originated on (open string — not tied to ChannelPlatform enum)';
