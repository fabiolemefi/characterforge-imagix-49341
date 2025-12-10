-- Remove FK constraint que aponta para auth.users
ALTER TABLE generated_images 
DROP CONSTRAINT IF EXISTS generated_images_user_id_fkey;

-- Criar FK para profiles (permite o join automático do PostgREST)
ALTER TABLE generated_images 
ADD CONSTRAINT generated_images_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;