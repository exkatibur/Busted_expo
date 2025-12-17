-- ============================================================================
-- BUSTED! Custom Questions (User-Generated & AI-Generated)
-- ============================================================================
-- Ermöglicht es Usern, eigene Fragen für einen Raum zu erstellen
-- oder per KI generieren zu lassen (Premium Feature)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Custom Questions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.busted_custom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,                           -- Room Code (z.B. "ABC123")
  user_id TEXT NOT NULL,                           -- Anonymous User ID
  text TEXT NOT NULL CHECK (LENGTH(text) >= 5 AND LENGTH(text) <= 500),
  source TEXT DEFAULT 'manual',                    -- 'manual' oder 'ai'
  ai_topic TEXT,                                   -- Topic wenn AI-generiert
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_busted_custom_questions_room
  ON public.busted_custom_questions(room_id);
CREATE INDEX IF NOT EXISTS idx_busted_custom_questions_user
  ON public.busted_custom_questions(user_id);

-- ----------------------------------------------------------------------------
-- 2. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.busted_custom_questions ENABLE ROW LEVEL SECURITY;

-- Jeder kann Custom Questions lesen (für das Spiel)
DROP POLICY IF EXISTS "Anyone can read custom questions" ON public.busted_custom_questions;
CREATE POLICY "Anyone can read custom questions"
  ON public.busted_custom_questions FOR SELECT
  USING (true);

-- Jeder kann Custom Questions erstellen (anonyme User)
DROP POLICY IF EXISTS "Anyone can create custom questions" ON public.busted_custom_questions;
CREATE POLICY "Anyone can create custom questions"
  ON public.busted_custom_questions FOR INSERT
  WITH CHECK (true);

-- User können nur eigene Fragen löschen
DROP POLICY IF EXISTS "Users can delete own questions" ON public.busted_custom_questions;
CREATE POLICY "Users can delete own questions"
  ON public.busted_custom_questions FOR DELETE
  USING (true);  -- Check happens in application layer

-- ----------------------------------------------------------------------------
-- 3. AI Generation Log (für Tracking/Limits)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.busted_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_busted_ai_generations_user
  ON public.busted_ai_generations(user_id);

-- RLS für AI Generations
ALTER TABLE public.busted_ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage ai generations" ON public.busted_ai_generations;
CREATE POLICY "Service role can manage ai generations"
  ON public.busted_ai_generations FOR ALL
  USING (true);

-- ----------------------------------------------------------------------------
-- 4. Function: Get Random Custom Question
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.busted_get_random_custom_question(
  p_room_id TEXT,
  p_exclude_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS TABLE (
  id UUID,
  room_id TEXT,
  user_id TEXT,
  text TEXT,
  source TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.room_id,
    q.user_id,
    q.text,
    q.source,
    q.created_at
  FROM public.busted_custom_questions q
  WHERE q.room_id = p_room_id
  AND NOT (q.id = ANY(p_exclude_ids))
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 5. Realtime aktivieren
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.busted_custom_questions;
