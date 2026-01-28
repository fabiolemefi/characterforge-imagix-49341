
# Plano: Permitir Visualização de Todos os Links do Efi Link

## Situação Atual

A tabela `efi_links` possui estas políticas RLS:

| Operação | Política Atual |
|----------|----------------|
| SELECT | `auth.uid() = user_id` (apenas links próprios) |
| INSERT | `auth.uid() = user_id` (criar apenas próprios) |
| UPDATE | `auth.uid() = user_id` (editar apenas próprios) |
| DELETE | `auth.uid() = user_id` (excluir apenas próprios) |

## Alteração Necessária

Modificar apenas a política de **SELECT** para permitir que todos os usuários autenticados vejam todos os links.

### Migration SQL

```sql
-- Remover política atual de SELECT
DROP POLICY IF EXISTS "Users can view their own links" ON public.efi_links;

-- Criar nova política: todos os autenticados podem ver todos os links
CREATE POLICY "Authenticated users can view all links"
  ON public.efi_links
  FOR SELECT
  TO authenticated
  USING (true);
```

## Políticas Finais

| Operação | Política | Comportamento |
|----------|----------|---------------|
| SELECT | `true` (para authenticated) | Todos veem todos os links |
| INSERT | `auth.uid() = user_id` | Criar apenas próprios |
| UPDATE | `auth.uid() = user_id` | Editar apenas próprios |
| DELETE | `auth.uid() = user_id` | Excluir apenas próprios |

## Considerações de UX

Após a alteração, pode ser útil adicionar na listagem uma indicação de quem criou cada link (nome ou email do criador). Isso pode ser implementado posteriormente se desejado.

## Resumo

- Apenas a política de SELECT será alterada
- INSERT/UPDATE/DELETE continuam restritos ao próprio usuário
- Nenhuma alteração no código frontend é necessária
