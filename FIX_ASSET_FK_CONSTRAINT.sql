-- FIX INCORRECT FOREIGN KEY CONSTRAINT
-- The existing constraint points to 'entities', but it should point to 'auth.users'

-- 1. Drop the incorrect constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_reviewed_by_fkey;

-- 2. Add the correct constraint pointing to auth.users
ALTER TABLE assets 
  ADD CONSTRAINT assets_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES auth.users(id);

-- Verify
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'assets'
AND kcu.column_name = 'reviewed_by';
