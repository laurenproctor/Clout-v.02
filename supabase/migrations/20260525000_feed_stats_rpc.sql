-- Returns the count of distinct tags across all signal_cards
CREATE OR REPLACE FUNCTION count_distinct_signal_tags()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT tag)
  FROM signal_cards, LATERAL UNNEST(tags) AS tag
  WHERE tag IS NOT NULL AND tag <> '';
$$;
