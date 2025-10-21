
-- Adicionar campo de cargo na tabela profiles
ALTER TABLE profiles 
ADD COLUMN job_title text;

-- Adicionar campo de autor na tabela blog_posts
ALTER TABLE blog_posts
ADD COLUMN author_id uuid REFERENCES profiles(id);

-- Atualizar posts existentes para usar created_by como author_id
UPDATE blog_posts
SET author_id = created_by
WHERE author_id IS NULL AND created_by IS NOT NULL;
