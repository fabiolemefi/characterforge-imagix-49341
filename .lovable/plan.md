

# Gerar arquivo SQL com INSERTs dos efi_links

O volume de dados é grande (80+ links) e o resultado da query já foi obtido. Vou gerar um arquivo `.sql` completo e disponibilizá-lo para download.

## Plano

1. Executar `psql` com `COPY` para exportar os dados como SQL INSERT statements para `/mnt/documents/efi_links_import.sql`
2. Incluir no arquivo:
   - Header com `CREATE TABLE` (caso a tabela não exista)
   - Todos os `INSERT INTO` statements
   - Políticas RLS
3. Disponibilizar como artifact para download

## Conteúdo do arquivo

```sql
-- 1. CREATE TABLE (IF NOT EXISTS)
-- 2. RLS policies
-- 3. INSERT INTO ... VALUES (...) para cada um dos ~80 links
-- 4. Trigger de updated_at
```

