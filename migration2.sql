-- Executar no Supabase SQL Editor

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Limpar o cache de schema do Supabase para que a API reconheça as novas colunas
NOTIFY pgrst, 'reload schema';
