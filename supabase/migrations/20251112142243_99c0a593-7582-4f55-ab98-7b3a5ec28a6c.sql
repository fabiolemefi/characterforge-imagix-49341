-- Adicionar foreign key da tabela tests para profiles
ALTER TABLE tests 
  ADD CONSTRAINT tests_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Adicionar foreign key opcional para updated_by
ALTER TABLE tests 
  ADD CONSTRAINT tests_updated_by_fkey 
  FOREIGN KEY (updated_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;