-- Add profile photo URL to channels so it can be displayed throughout the UX
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS profile_image_url text;
