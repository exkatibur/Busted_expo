-- ============================================================================
-- BUSTED! Subscription System
-- ============================================================================
-- Einfaches Subscription-Modell statt Credits:
-- - Party Pass (24h): 1.99€ - KI-Fragen, Spicy Vibe, Premium Vibes
-- - Premium (Monat): 2.99€/Mo - Alles + Fragen speichern + Werbefrei
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Subscriptions Table (Pro User)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.busted_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,           -- Ein Eintrag pro User
  premium_until TIMESTAMPTZ DEFAULT NULL, -- Monatliches Premium Abo
  party_pass_until TIMESTAMPTZ DEFAULT NULL, -- 24h Party Pass
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_busted_subscriptions_user ON public.busted_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- 2. Payment History (für Nachverfolgung)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.busted_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL,                  -- 'party_pass' oder 'premium'
  price_cents INTEGER NOT NULL,           -- Gezahlter Betrag in Cent
  source TEXT NOT NULL,                   -- 'stripe', 'revenuecat_apple', 'revenuecat_google'
  external_id TEXT,                       -- Payment Provider ID
  valid_until TIMESTAMPTZ NOT NULL,       -- Gültigkeit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_busted_payments_user ON public.busted_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_busted_payments_external ON public.busted_payments(external_id);

-- ----------------------------------------------------------------------------
-- 3. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.busted_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.busted_payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Jeder kann seinen eigenen Status sehen
DROP POLICY IF EXISTS "Users can view own subscription" ON public.busted_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.busted_subscriptions FOR SELECT
  USING (true);  -- Anonyme User haben keine auth.uid(), daher offen

-- Payments: Nur Service Role (Webhooks) kann einfügen
DROP POLICY IF EXISTS "Service role can manage payments" ON public.busted_payments;
CREATE POLICY "Service role can manage payments"
  ON public.busted_payments FOR ALL
  USING (auth.role() = 'service_role');

-- Service Role kann Subscriptions verwalten
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.busted_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.busted_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. Function: Activate Subscription
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.busted_activate_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_price_cents INTEGER,
  p_source TEXT,
  p_external_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_duration INTERVAL;
  v_valid_until TIMESTAMPTZ;
BEGIN
  -- Bestimme Dauer basierend auf Plan
  IF p_plan_id = 'party_pass' THEN
    v_duration := INTERVAL '24 hours';
  ELSIF p_plan_id = 'premium' THEN
    v_duration := INTERVAL '1 month';
  ELSE
    RAISE EXCEPTION 'Unknown plan: %', p_plan_id;
  END IF;

  -- Berechne Gültigkeit (ab jetzt oder verlängern falls noch aktiv)
  IF p_plan_id = 'party_pass' THEN
    SELECT GREATEST(COALESCE(party_pass_until, now()), now()) + v_duration
    INTO v_valid_until
    FROM public.busted_subscriptions
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      v_valid_until := now() + v_duration;
    END IF;
  ELSE
    SELECT GREATEST(COALESCE(premium_until, now()), now()) + v_duration
    INTO v_valid_until
    FROM public.busted_subscriptions
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      v_valid_until := now() + v_duration;
    END IF;
  END IF;

  -- Upsert Subscription
  INSERT INTO public.busted_subscriptions (user_id, premium_until, party_pass_until, updated_at)
  VALUES (
    p_user_id,
    CASE WHEN p_plan_id = 'premium' THEN v_valid_until ELSE NULL END,
    CASE WHEN p_plan_id = 'party_pass' THEN v_valid_until ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    premium_until = CASE
      WHEN p_plan_id = 'premium' THEN v_valid_until
      ELSE public.busted_subscriptions.premium_until
    END,
    party_pass_until = CASE
      WHEN p_plan_id = 'party_pass' THEN v_valid_until
      ELSE public.busted_subscriptions.party_pass_until
    END,
    updated_at = now();

  -- Log Payment
  INSERT INTO public.busted_payments (user_id, plan_id, price_cents, source, external_id, valid_until)
  VALUES (p_user_id, p_plan_id, p_price_cents, p_source, p_external_id, v_valid_until);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. Function: Check Subscription Status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.busted_check_subscription(p_user_id UUID)
RETURNS TABLE (
  is_premium BOOLEAN,
  has_party_pass BOOLEAN,
  premium_until TIMESTAMPTZ,
  party_pass_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.premium_until > now(), FALSE) AS is_premium,
    COALESCE(s.party_pass_until > now(), FALSE) AS has_party_pass,
    s.premium_until,
    s.party_pass_until
  FROM public.busted_subscriptions s
  WHERE s.user_id = p_user_id;

  -- Falls kein Eintrag, gib default zurück
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. Realtime aktivieren
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.busted_subscriptions;
