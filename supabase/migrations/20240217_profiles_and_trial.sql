-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- 4. Function to check subscription status (for RLS on other tables)
-- Example usage for other tables: 
-- CREATE POLICY "Users can only access if they have active trial/premium" 
-- ON public.your_table FOR ALL USING (public.has_active_subscription(auth.uid()));
CREATE OR REPLACE FUNCTION public.has_active_subscription(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_prem BOOLEAN;
  t_start TIMESTAMPTZ;
BEGIN
  SELECT is_premium, trial_start INTO is_prem, t_start FROM public.profiles WHERE id = target_user_id;
  -- Access granted if premium OR within 7-day trial
  RETURN COALESCE(is_prem, FALSE) OR (COALESCE(t_start, NOW()) + INTERVAL '7 days') > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, trial_start)
  VALUES (new.id, new.email, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;
