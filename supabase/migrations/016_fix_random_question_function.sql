-- Migration: Fix busted_get_random_question function
-- Description: Fix type mismatch between table columns and function return types

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS busted_get_random_question(TEXT, UUID[], TEXT);

CREATE OR REPLACE FUNCTION busted_get_random_question(
  p_vibe TEXT,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_language TEXT DEFAULT 'de'
)
RETURNS TABLE (
  id UUID,
  vibe VARCHAR(20),
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION busted_get_random_question(TEXT, UUID[], TEXT) TO anon, authenticated;

-- Test the function
DO $$
DECLARE
  test_result RECORD;
BEGIN
  SELECT * INTO test_result FROM busted_get_random_question('party', ARRAY[]::UUID[], 'de');
  IF test_result.id IS NOT NULL THEN
    RAISE NOTICE 'Function works! Sample question: %', test_result.text;
  ELSE
    RAISE NOTICE 'Function works but no German party questions found';
  END IF;
END $$;
