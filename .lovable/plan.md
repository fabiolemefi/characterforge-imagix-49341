

# Plano: Corrigir Reversão de Blocos ao Salvar

## Diagnóstico do Problema

O problema ocorre na seguinte sequência:

```text
1. Você arrasta o bloco "Questionário" → HtmlBlock recebe html_content CORRETO (size-10) ✓
2. Você edita e/ou clica em Salvar → handleSave serializa o estado CORRETO ✓
3. updateSite.mutateAsync salva no banco → Dados salvos CORRETAMENTE (size-10) ✓
4. onSuccess invalida queryClient → Invalida ['efi-code-sites'] mas TAMBÉM ['efi-code-site', id]
5. React Query refaz a query useEfiCodeSite(id) → Busca dados atualizados
6. useEffect([site]) dispara → SOBRESCREVE editorState com site.content
7. actions.deserialize(editorState) → Recarrega o editor com dados do banco
```

**O problema está nos passos 6 e 7**: Após salvar, o `useEffect` que observa `site` recarrega o `editorState` e chama `actions.deserialize()`, o que força o editor a recarregar. Se houver qualquer diferença entre o estado serializado atual e o que foi salvo no banco (formatação, normalização, etc.), isso pode causar recarregamento indesejado.

Mas o ponto principal é: **o banco está CORRETO com `size-10`**. Se após salvar o bloco aparece com `size-40`, isso significa que:

1. Há outro bloco antigo no banco sendo carregado
2. Ou há cache local do React Query com dados antigos
3. Ou o `editorState` está sendo sobrescrito por dados desatualizados

## Solução Proposta

### 1. Evitar recarregar o editor após salvar

O `useEffect([site])` não deve recarregar o `editorState` após um salvamento bem-sucedido. Isso porque o editor já tem o estado correto - não precisamos "recarregar" do banco.

**Arquivo:** `src/pages/EfiCodeEditor.tsx`

```typescript
// Adicionar ref para saber se acabou de salvar
const justSavedRef = useRef(false);

// No handleSave, marcar que salvou
const handleSave = useCallback(async (query: any) => {
  // ... código existente ...
  try {
    await updateSite.mutateAsync({...});
    justSavedRef.current = true; // Marcar que salvou
    // ... resto ...
  }
}, [...]);

// No useEffect, ignorar atualização após salvar
useEffect(() => {
  if (site) {
    // Se acabou de salvar, não recarregar o editor (já temos o estado correto)
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    
    setSiteName(site.name);
    if (site.content && Object.keys(site.content).length > 0) {
      setEditorState(JSON.stringify(site.content));
    }
    // ... resto ...
  }
}, [site]);
```

### 2. Invalidar query específica do site

Para garantir que o cache seja atualizado corretamente, modificar `useEfiCodeSites.ts`:

**Arquivo:** `src/hooks/useEfiCodeSites.ts`

```typescript
const updateSite = useMutation({
  // ... mutationFn existente ...
  onSuccess: (data, variables) => {
    // Invalidar lista E o site específico
    queryClient.invalidateQueries({ queryKey: ['efi-code-sites'] });
    queryClient.invalidateQueries({ queryKey: ['efi-code-site', variables.id] });
  },
  // ... resto ...
});
```

### 3. Verificar cache do React Query para blocos

O `useEfiCodeBlocks` pode estar retornando dados em cache antigos do bloco "Questionário de Avaliação". 

**Arquivo:** `src/hooks/useEfiCodeBlocks.ts`

Adicionar `staleTime: 0` para forçar sempre buscar dados frescos:

```typescript
const blocksQuery = useQuery({
  queryKey: ['efi-code-blocks', onlyActive],
  queryFn: async () => { ... },
  staleTime: 0, // Sempre buscar dados frescos
});
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Adicionar `justSavedRef` para evitar recarregar editor após salvar |
| `src/hooks/useEfiCodeSites.ts` | Invalidar query específica do site no `onSuccess` |
| `src/hooks/useEfiCodeBlocks.ts` | Adicionar `staleTime: 0` para evitar cache antigo dos blocos |

## Comportamento Esperado Após Correção

1. Arrastar bloco → Aparece com HTML CORRETO do banco (size-10)
2. Salvar → Estado atual é salvo no banco
3. Após salvar → Editor NÃO recarrega (mantém o estado que você já tem)
4. Navegar para outra página e voltar → Carrega dados frescos do banco
5. Atualizar bloco no admin → Próximo uso do bloco vem com dados atualizados

