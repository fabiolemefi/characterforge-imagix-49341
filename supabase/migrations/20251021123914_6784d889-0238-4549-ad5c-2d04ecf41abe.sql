
-- Adicionar role de admin ao primeiro usuário (se houver)
-- Isso permite que o usuário atual possa criar posts
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin'::app_role)
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- Atualizar também o campo is_admin na tabela profiles
UPDATE profiles
SET is_admin = true
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'::app_role
)
AND is_admin = false;
