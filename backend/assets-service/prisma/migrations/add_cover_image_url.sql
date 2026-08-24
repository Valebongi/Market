-- Migration: add cover_image_url to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
