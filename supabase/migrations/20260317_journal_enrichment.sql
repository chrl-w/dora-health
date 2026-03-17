-- Journal enrichment: entry types and important flag
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS important  BOOLEAN NOT NULL DEFAULT false;
