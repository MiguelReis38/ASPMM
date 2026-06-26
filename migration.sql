-- Executar no Supabase SQL Editor

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS validity_date DATE,
ADD COLUMN IF NOT EXISTS card_number TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Titular';

-- Limpar o cache de schema do Supabase para que a API reconheça as novas colunas
NOTIFY pgrst, 'reload schema';
