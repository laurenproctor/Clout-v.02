ALTER TABLE brand_imagery_profiles
  ADD COLUMN IF NOT EXISTS negative_example_board text[] DEFAULT '{}';
