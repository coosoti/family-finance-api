-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  monthly_income DECIMAL(12, 2) DEFAULT 0,
  dependents INTEGER DEFAULT 0,
  password_hash TEXT,
  google_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- BUDGET CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budgeted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('needs', 'wants', 'savings', 'growth')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own categories"
  ON public.budget_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.budget_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.budget_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.budget_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_budget_categories_user_id ON public.budget_categories(user_id);

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'saving', 'ipp', 'asset', 'liability')),
  notes TEXT,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_month ON public.transactions(month);
CREATE INDEX idx_transactions_user_month ON public.transactions(user_id, month);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);

-- =============================================
-- SAVINGS GOALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  monthly_contribution DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own goals"
  ON public.savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_savings_goals_user_id ON public.savings_goals(user_id);

-- =============================================
-- IPP ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ipp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  current_balance DECIMAL(12, 2) DEFAULT 0,
  monthly_contribution DECIMAL(12, 2) DEFAULT 0,
  total_contributions DECIMAL(12, 2) DEFAULT 0,
  tax_relief_rate DECIMAL(5, 4) DEFAULT 0.3,
  realized_value DECIMAL(12, 2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ipp_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own IPP"
  ON public.ipp_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own IPP"
  ON public.ipp_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own IPP"
  ON public.ipp_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ipp_accounts_user_id ON public.ipp_accounts(user_id);

-- =============================================
-- ASSETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability')),
  category TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON public.assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON public.assets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_assets_user_id ON public.assets(user_id);

-- =============================================
-- MONTHLY SNAPSHOTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  income DECIMAL(12, 2) DEFAULT 0,
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  total_savings DECIMAL(12, 2) DEFAULT 0,
  ipp_contributions DECIMAL(12, 2) DEFAULT 0,
  net_worth DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own snapshots"
  ON public.monthly_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.monthly_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.monthly_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.monthly_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_monthly_snapshots_user_id ON public.monthly_snapshots(user_id);
CREATE INDEX idx_monthly_snapshots_month ON public.monthly_snapshots(month);

-- =============================================
-- ADDITIONAL INCOME TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.additional_income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  month TEXT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.additional_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own income"
  ON public.additional_income FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income"
  ON public.additional_income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
  ON public.additional_income FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
  ON public.additional_income FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_additional_income_user_id ON public.additional_income(user_id);
CREATE INDEX idx_additional_income_month ON public.additional_income(month);

-- =============================================
-- INVESTMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('money-market', 'unit-trust', 'government-bond', 'stock', 'sacco', 'reit', 'other')),
  units DECIMAL(12, 4) NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  current_price DECIMAL(12, 2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments"
  ON public.investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments"
  ON public.investments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_investments_user_id ON public.investments(user_id);

-- =============================================
-- DIVIDEND PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.dividend_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dividend', 'interest')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dividend_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dividends"
  ON public.dividend_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dividends"
  ON public.dividend_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dividends"
  ON public.dividend_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dividends"
  ON public.dividend_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_dividend_payments_user_id ON public.dividend_payments(user_id);
CREATE INDEX idx_dividend_payments_investment_id ON public.dividend_payments(investment_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate net worth
CREATE OR REPLACE FUNCTION calculate_net_worth(user_uuid UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  total_assets DECIMAL(12, 2);
  total_liabilities DECIMAL(12, 2);
  ipp_balance DECIMAL(12, 2);
BEGIN
  -- Calculate total assets
  SELECT COALESCE(SUM(amount), 0)
  INTO total_assets
  FROM public.assets
  WHERE user_id = user_uuid AND type = 'asset';

  -- Calculate total liabilities
  SELECT COALESCE(SUM(amount), 0)
  INTO total_liabilities
  FROM public.assets
  WHERE user_id = user_uuid AND type = 'liability';

  -- Get IPP balance
  SELECT COALESCE(current_balance, 0)
  INTO ipp_balance
  FROM public.ipp_accounts
  WHERE user_id = user_uuid;

  RETURN total_assets + ipp_balance - total_liabilities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, monthly_income, dependents)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();