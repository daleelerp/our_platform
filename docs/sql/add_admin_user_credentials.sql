
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.admin_credentials (username, password_hash, is_active, created_at)
VALUES (
  'username',
  '$2b$10$rK8X9YzP5wQ3mN4vB7cD8eF2gH6jK9L0M1N2O3P4Q5R6S7T8U9V0W', -- This is a placeholder, we'll generate the real hash
  true,
  now()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = now();

SELECT id, username, is_active, created_at 
FROM public.admin_credentials 
WHERE username = '@username';

