
# Plano: Corrigir Race Condition no Salvamento do EfiCodeEditor

## Problema Identificado

Quando o usuário salva edições no EfiCode, as alterações são perdidas e o conteúdo original é recarregado. Isso acontece devido a uma **race condition** no fluxo de salvamento:

### Fluxo Problemático Atual

```
1. handleSave() chamado
   |
   v
2. updateSite.mutateAsync() inicia
   |
   v
3. Supabase atualiza o banco ✓
   |
   v
4. onSuccess do updateSite dispara:
   - invalidateQueries(['efi-code-site', id])
   |
   v
5. React Query refetch automático
   |
   v
6. useEffect(site) detecta mudança → 
   justSavedRef.current ainda é FALSE! → 
   Chama setEditorState(dados do banco) → 
   ESTADO SOBRESCRITO COM DADOS ANTIGOS!
   |
   v
7. Só AGORA mutateAsync resolve e 
   justSavedRef.current = true (tarde demais!)
```

### Por que acontece

O `onSuccess` do mutation executa **antes** do `mutateAsync` retornar. Isso significa que a invalidação da query e o refetch acontecem **durante** a execução assíncrona, não depois.

## Solução

Mudar a lógica para definir `justSavedRef.current = true` **ANTES** de chamar `mutateAsync`, e usar uma abordagem mais robusta para gerenciar o estado do editor após o salvamento.

### Estratégia

1. **Definir flag ANTES do save**: `justSavedRef.current = true` antes de `mutateAsync`
2. **Manter flag por mais tempo**: Usar um timeout para resetar a flag, não apenas no próximo ciclo
3. **Atualizar editorState com dados salvos**: Atualizar o `editorState` com o conteúdo que acabou de ser salvo, não com o que veio do banco

## Alterações

### Arquivo: `src/pages/EfiCodeEditor.tsx`

#### Alteração 1: Marcar flag ANTES de salvar

```typescript
const handleSave = useCallback(async (query: any) => {
  if (!id) return;
  
  setIsSaving(true);
  const serialized = query.serialize();
  
  // Mark BEFORE save to prevent reload from query invalidation
  justSavedRef.current = true;
  
  try {
    await updateSite.mutateAsync({
      id,
      name: siteName,
      content: JSON.parse(serialized),
      page_settings: pageSettings
    });
    
    // Update editorState with what we just saved (não depender do refetch)
    setEditorState(serialized);
    
    // Reset original values after successful save
    originalSiteNameRef.current = siteName;
    originalPageSettingsRef.current = pageSettings;
    setHasEditorChanges(false);
    
    toast.success('Site salvo com sucesso!');
    
    // Keep flag true for a bit longer to handle async refetch
    setTimeout(() => {
      justSavedRef.current = false;
    }, 1000);
    
    // If there's a pending preview, open it
    if (pendingPreviewRef.current) {
      pendingPreviewRef.current = false;
      window.open(`/efi-code/${id}/preview`, '_blank');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
    justSavedRef.current = false; // Reset on error
    pendingPreviewRef.current = false;
  } finally {
    setIsSaving(false);
  }
}, [id, siteName, pageSettings, updateSite]);
```

#### Alteração 2: Melhorar o useEffect que observa `site`

O `useEffect` atual reseta a flag muito rápido. Precisamos também verificar se estamos no processo de salvamento:

```typescript
useEffect(() => {
  if (site) {
    // If we just saved OR are currently saving, don't reload the editor
    if (justSavedRef.current || isSaving) {
      return;
    }
    
    setSiteName(site.name);
    if (site.content && Object.keys(site.content).length > 0) {
      setEditorState(JSON.stringify(site.content));
    }
    if (site.page_settings) {
      setPageSettings(site.page_settings);
    }
    
    // Set original refs on initial load
    if (isInitialLoadRef.current) {
      originalSiteNameRef.current = site.name;
      originalPageSettingsRef.current = site.page_settings || defaultPageSettings;
      isInitialLoadRef.current = false;
    }
  }
}, [site, isSaving]);
```

## Diagrama do Fluxo Corrigido

```
1. handleSave() chamado
   |
   v
2. justSavedRef.current = TRUE  ← Definido ANTES!
   |
   v
3. updateSite.mutateAsync() inicia
   |
   v
4. Supabase atualiza o banco ✓
   |
   v
5. onSuccess → invalidateQueries
   |
   v
6. React Query refetch
   |
   v
7. useEffect(site) detecta mudança →
   justSavedRef.current é TRUE →
   IGNORA a atualização! ✓
   |
   v
8. mutateAsync resolve
   |
   v
9. setEditorState(serialized) ← Estado local atualizado
   |
   v
10. setTimeout 1000ms → justSavedRef.current = false
```

## Resumo das Mudanças

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Momento da flag | Depois de `mutateAsync` | **Antes** de `mutateAsync` |
| Reset da flag | Imediato no próximo ciclo | Timeout de 1 segundo |
| Estado do editor | Dependia do refetch | Atualizado localmente após save |
| Verificação no useEffect | Só `justSavedRef` | `justSavedRef` **OU** `isSaving` |

## Arquivos Modificados

- `src/pages/EfiCodeEditor.tsx`:
  - Função `handleSave`: Mover flag para antes do save + atualizar estado local
  - `useEffect` do `site`: Adicionar verificação de `isSaving`
