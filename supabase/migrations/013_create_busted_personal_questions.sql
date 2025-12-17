-- ============================================================================
-- Migration: Personal Question Pool
-- Issue #8: User können persönlichen Fragenpool abspeichern (Premium)
-- ============================================================================

-- Tabelle für persönliche Fragen (Premium Feature)
CREATE TABLE IF NOT EXISTS public.busted_personal_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (LENGTH(text) >= 5 AND LENGTH(text) <= 500),
  category TEXT DEFAULT 'custom',  -- Für spätere Kategorisierung
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle User-Abfragen
CREATE INDEX IF NOT EXISTS idx_busted_personal_questions_user
  ON public.busted_personal_questions(user_id);

-- RLS aktivieren
ALTER TABLE public.busted_personal_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User können nur ihre eigenen Fragen sehen
CREATE POLICY "Users can view own personal questions"
  ON public.busted_personal_questions FOR SELECT
  USING (true);

-- User können nur eigene Fragen erstellen
CREATE POLICY "Users can create own personal questions"
  ON public.busted_personal_questions FOR INSERT
  WITH CHECK (true);

-- User können nur eigene Fragen updaten
CREATE POLICY "Users can update own personal questions"
  ON public.busted_personal_questions FOR UPDATE
  USING (true);

-- User können nur eigene Fragen löschen
CREATE POLICY "Users can delete own personal questions"
  ON public.busted_personal_questions FOR DELETE
  USING (true);

-- Function: Persönliche Fragen in Raum kopieren
CREATE OR REPLACE FUNCTION public.busted_copy_personal_to_room(
  p_user_id TEXT,
  p_room_id TEXT,
  p_question_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_question RECORD;
BEGIN
  FOR v_question IN
    SELECT id, text
    FROM public.busted_personal_questions
    WHERE user_id = p_user_id
    AND id = ANY(p_question_ids)
  LOOP
    INSERT INTO public.busted_custom_questions (room_id, user_id, text, source)
    VALUES (p_room_id, p_user_id, v_question.text, 'personal')
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function: Custom Question als persönliche Frage speichern
CREATE OR REPLACE FUNCTION public.busted_save_to_personal(
  p_user_id TEXT,
  p_question_text TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.busted_personal_questions (user_id, text)
  VALUES (p_user_id, p_question_text)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.busted_personal_questions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.busted_copy_personal_to_room TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.busted_save_to_personal TO anon, authenticated;
