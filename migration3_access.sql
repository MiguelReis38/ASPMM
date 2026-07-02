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
