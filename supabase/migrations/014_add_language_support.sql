-- Migration: Add language support for questions
-- This allows filtering questions by the host's language

-- 1. Add host_language to rooms table
ALTER TABLE busted_rooms
ADD COLUMN IF NOT EXISTS host_language TEXT DEFAULT 'en'
CHECK (host_language IN ('en', 'de'));

-- 2. Add language to questions table
ALTER TABLE busted_questions
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'de'
CHECK (language IN ('en', 'de'));

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_busted_rooms_host_language ON busted_rooms(host_language);
CREATE INDEX IF NOT EXISTS idx_busted_questions_language ON busted_questions(language);

-- 4. Update existing questions to German (they were originally in German)
UPDATE busted_questions SET language = 'de' WHERE language IS NULL OR language = 'en';

-- 5. Update the random question function to filter by language
CREATE OR REPLACE FUNCTION busted_get_random_question(
  p_vibe TEXT,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_language TEXT DEFAULT 'de'
)
RETURNS TABLE (
  id UUID,
  vibe TEXT,
  text TEXT,
  is_premium BOOLEAN,
  language TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.vibe,
    q.text,
    q.is_premium,
    q.language
  FROM busted_questions q
  WHERE q.vibe = p_vibe
    AND q.is_premium = false
    AND q.language = p_language
    AND q.id != ALL(p_exclude_ids)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION busted_get_random_question(TEXT, UUID[], TEXT) TO anon, authenticated;

-- 7. Comment for documentation
COMMENT ON COLUMN busted_rooms.host_language IS 'Language preference of the room host (en or de)';
COMMENT ON COLUMN busted_questions.language IS 'Language of the question text (en or de)';
