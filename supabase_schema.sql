-- Create ENUM for roles if needed, or just use text constraints.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: members
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, 
    member_code TEXT UNIQUE, -- Novo: Código visível do sócio (ex: 6 dígitos)
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    workplace TEXT,
    is_dependent BOOLEAN DEFAULT FALSE,
    primary_member_id UUID REFERENCES members(id) ON DELETE CASCADE, 
    birth_date DATE NOT NULL,
    is_pcd BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    photo_url TEXT,
    payslip_url TEXT, -- Novo: Holerite (comprovante)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Table: announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author_id UUID REFERENCES members(id) ON DELETE SET NULL
);

-- Helper function to avoid infinite recursion on RLS (Runs as Postgres Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function to get current member ID safely
CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 1. Members Table Policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Remove old policies to recreate them cleanly if they existed
DROP POLICY IF EXISTS "Admins have full access to members" ON members;
DROP POLICY IF EXISTS "Users can read own profile and dependents" ON members;
DROP POLICY IF EXISTS "Users can update own profile" ON members;
DROP POLICY IF EXISTS "Allow public registration" ON members;

CREATE POLICY "Admins have full access to members"
ON members FOR ALL
USING ( public.is_admin() );

CREATE POLICY "Users can read own profile and dependents"
ON members FOR SELECT
USING (
    user_id = auth.uid() OR primary_member_id = public.get_my_member_id()
);

CREATE POLICY "Users can update own profile"
ON members FOR UPDATE
USING ( user_id = auth.uid() );

CREATE POLICY "Allow public registration"
ON members FOR INSERT
WITH CHECK (true);

-- 2. Payments Table Policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to payments" ON payments;
DROP POLICY IF EXISTS "Users can view own and dependents payments" ON payments;

CREATE POLICY "Admins have full access to payments"
ON payments FOR ALL
USING ( public.is_admin() );

CREATE POLICY "Users can view own and dependents payments"
ON payments FOR SELECT
USING (
    member_id = public.get_my_member_id() OR member_id IN (
        SELECT id FROM members WHERE primary_member_id = public.get_my_member_id()
    )
);

-- 3. Announcements Table Policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can insert/update/delete announcements" ON announcements;

CREATE POLICY "Anyone can read announcements"
ON announcements FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert/update/delete announcements"
ON announcements FOR ALL
USING ( public.is_admin() );

-- Helper function to calculate if dependent is exempt
CREATE OR REPLACE FUNCTION is_exempt(birth_date DATE, is_pcd BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
    age INT;
BEGIN
    IF is_pcd THEN
        RETURN TRUE;
    END IF;
    
    age := DATE_PART('year', AGE(birth_date));
    IF age < 18 OR age >= 60 THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 4. Storage Bucket Setup (Avatars and Documents)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their avatar." ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their avatar."
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' );

-- Storage Policies for Documents (Holerite)
DROP POLICY IF EXISTS "Admins can see documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload documents" ON storage.objects;

CREATE POLICY "Admins can see documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' AND public.is_admin() );

CREATE POLICY "Anyone can upload documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' );

-- Table: access_logs
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for access_logs
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to access_logs" ON access_logs;
DROP POLICY IF EXISTS "Users can view own access_logs" ON access_logs;

CREATE POLICY "Admins have full access to access_logs"
ON access_logs FOR ALL
USING ( public.is_admin() );

CREATE POLICY "Users can view own access_logs"
ON access_logs FOR SELECT
USING (
    member_id = public.get_my_member_id() OR member_id IN (
        SELECT id FROM members WHERE primary_member_id = public.get_my_member_id()
    )
);
