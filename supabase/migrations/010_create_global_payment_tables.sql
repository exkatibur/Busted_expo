-- ============================================================================
-- Global Payment Tables for Kassiopeia Ecosystem
-- ============================================================================
-- Diese Tabellen sind GLOBAL für alle Apps im Ökosystem.
-- Sie sollten nur EINMAL in der Supabase-Instanz erstellt werden.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles (Global User Profile)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS für profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Credits (Per App!)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,                    -- 'busted', 'tidysnap', etc.
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app)                  -- Ein Eintrag pro User pro App
);

-- RLS für credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;
CREATE POLICY "Users can view own credits"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- Nur Service Role (Backend) darf Credits ändern!
DROP POLICY IF EXISTS "Service role can modify credits" ON public.credits;
CREATE POLICY "Service role can modify credits"
  ON public.credits FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 3. Transactions (Payment History)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,                    -- Für welche App
  amount INTEGER NOT NULL,              -- Credits (+/-)
  price_cents INTEGER,                  -- Gezahlter Betrag in Cent
  source TEXT NOT NULL,                 -- 'stripe', 'revenuecat_apple', 'revenuecat_google', 'usage'
  external_id TEXT,                     -- Payment Provider ID
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS für transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Nur Service Role kann Transaktionen erstellen
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;
CREATE POLICY "Service role can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. App Access (Tracking welche Apps der User nutzt)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app TEXT NOT NULL,                    -- 'busted', 'tidysnap', etc.
  first_used_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, app)
);

-- RLS für app_access
ALTER TABLE public.app_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own app access" ON public.app_access;
CREATE POLICY "Users can view own app access"
  ON public.app_access FOR SELECT
  USING (auth.uid() = user_id);

-- Service Role kann app_access verwalten
DROP POLICY IF EXISTS "Service role can manage app access" ON public.app_access;
CREATE POLICY "Service role can manage app access"
  ON public.app_access FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 5. Trigger: Auto-Profil bei Signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profil erstellen
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. Function: Get or Create Credits für App
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_credits(p_user_id UUID, p_app TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Versuche Credits zu holen
  SELECT balance INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id AND app = p_app;

  -- Wenn nicht vorhanden, erstelle mit 0
  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, app, balance)
    VALUES (p_user_id, p_app, 0)
    RETURNING balance INTO v_balance;
  END IF;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. Function: Add Credits (für Webhooks)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_app TEXT,
  p_amount INTEGER,
  p_source TEXT,
  p_external_id TEXT,
  p_price_cents INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- 1. Credits aktualisieren/erstellen (upsert)
  INSERT INTO public.credits (user_id, app, balance, updated_at)
  VALUES (p_user_id, p_app, p_amount, now())
  ON CONFLICT (user_id, app)
  DO UPDATE SET
    balance = public.credits.balance + p_amount,
    updated_at = now();

  -- 2. Transaktion loggen
  INSERT INTO public.transactions (user_id, app, amount, price_cents, source, external_id, description)
  VALUES (p_user_id, p_app, p_amount, p_price_cents, p_source, p_external_id, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 8. Function: Use Credits (für Jobs/Features)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID,
  p_app TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- 1. Check if enough credits
  SELECT balance INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id AND app = p_app;

  -- Wenn Credits nicht existieren oder nicht genug
  IF NOT FOUND OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- 2. Deduct credits
  UPDATE public.credits
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND app = p_app;

  -- 3. Log transaction
  INSERT INTO public.transactions (user_id, app, amount, source, description)
  VALUES (p_user_id, p_app, -p_amount, 'usage', p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 9. Indexes für Performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_credits_user_app ON public.credits(user_id, app);
CREATE INDEX IF NOT EXISTS idx_transactions_user_app ON public.transactions(user_id, app);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_app_access_user_app ON public.app_access(user_id, app);
