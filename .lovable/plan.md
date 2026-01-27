
# Plano: Indicador de Alterações não Salvas e Confirmação ao Sair

## Objetivo

Implementar indicadores visuais de estado de salvamento no editor Efi Code, alertas ao tentar sair sem salvar, e confirmação antes do preview (que requer salvamento).

## Funcionalidades a Implementar

### 1. Indicador Visual no Botão Salvar

```text
Estado Salvo:                Estado Não Salvo:
┌─────────────┐              ┌─────────────────────┐
│ 💾 Salvar   │              │ 🔴 💾 Salvar*       │
└─────────────┘              └─────────────────────┘
                             (botão com destaque)
```

- Quando há alterações não salvas: mostrar indicador visual (ponto laranja/vermelho + asterisco)
- Botão pode mudar de variante (outline → default) para destacar a necessidade de salvar

### 2. Confirmação ao Sair da Página

Duas situações de saída:
- **Navegação interna** (botão voltar, links): usar `useBlocker` do react-router-dom
- **Fechamento/Refresh do navegador**: usar evento `beforeunload`

```text
┌─────────────────────────────────────────────────┐
│ ⚠️ Alterações não salvas                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Você tem alterações que não foram salvas.       │
│ Se sair agora, essas alterações serão perdidas. │
│                                                 │
│                    [Cancelar]  [Sair sem salvar]│
└─────────────────────────────────────────────────┘
```

### 3. Confirmação no Preview

O preview já força um salvamento antes de abrir. Adicionar diálogo explicativo:

```text
┌─────────────────────────────────────────────────┐
│ 👁️ Visualizar Prévia                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Para visualizar a prévia, é necessário salvar   │
│ as alterações atuais primeiro.                  │
│                                                 │
│ Deseja salvar e continuar?                      │
│                                                 │
│                     [Cancelar]  [Salvar e Abrir]│
└─────────────────────────────────────────────────┘
```

## Detecção de Alterações Não Salvas

A flag `hasUnsavedChanges` será calculada com base em:

1. **Alterações visuais no editor**: `canUndo` do Craft.js (indica que há histórico de undo)
2. **Alterações no nome do site**: comparar `siteName` atual com `site.name` original
3. **Alterações nas configurações**: comparar `pageSettings` com `site.page_settings` original

```typescript
// Lógica de detecção
const hasUnsavedChanges = useMemo(() => {
  if (!site) return false;
  
  const nameChanged = siteName !== site.name;
  const settingsChanged = JSON.stringify(pageSettings) !== JSON.stringify(site.page_settings);
  // canUndo vem do EditorActions interno
  
  return nameChanged || settingsChanged || hasEditorChanges;
}, [site, siteName, pageSettings, hasEditorChanges]);
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Adicionar estados de tracking, useBlocker, beforeunload, e dialogs |

## Implementação Detalhada

### 1. Novos Estados e Referências

```typescript
// Para comparar com valores originais
const originalSiteNameRef = useRef<string>('');
const originalPageSettingsRef = useRef<PageSettings>(defaultPageSettings);

// Estado para tracking de mudanças no editor (via callback)
const [hasEditorChanges, setHasEditorChanges] = useState(false);

// Estado para controle do diálogo de preview
const [showPreviewDialog, setShowPreviewDialog] = useState(false);

// Atualizar refs quando site carrega
useEffect(() => {
  if (site) {
    originalSiteNameRef.current = site.name;
    originalPageSettingsRef.current = site.page_settings || defaultPageSettings;
  }
}, [site]);
```

### 2. Cálculo de hasUnsavedChanges

```typescript
const hasUnsavedChanges = useMemo(() => {
  if (!site) return false;
  
  const nameChanged = siteName !== originalSiteNameRef.current;
  const settingsChanged = JSON.stringify(pageSettings) !== JSON.stringify(originalPageSettingsRef.current);
  
  return nameChanged || settingsChanged || hasEditorChanges;
}, [site, siteName, pageSettings, hasEditorChanges]);
```

### 3. Bloqueio de Navegação Interna (useBlocker)

```typescript
import { useBlocker } from 'react-router-dom';

// Dentro do componente
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
);

// Diálogo controlado pelo blocker
{blocker.state === 'blocked' && (
  <AlertDialog open>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
        <AlertDialogDescription>
          Você tem alterações que não foram salvas. Se sair agora, essas alterações serão perdidas.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => blocker.reset?.()}>
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction onClick={() => blocker.proceed?.()}>
          Sair sem salvar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

### 4. Bloqueio de Fechamento do Navegador

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### 5. Diálogo de Confirmação do Preview

```typescript
// Ao clicar em preview, mostrar diálogo primeiro
const handlePreviewClick = () => {
  if (hasUnsavedChanges) {
    setShowPreviewDialog(true);
  } else {
    // Se não há mudanças, abrir direto
    window.open(`/efi-code/${siteId}/preview`, '_blank');
  }
};

// Ao confirmar, salvar e abrir
const handleConfirmPreview = async () => {
  await onSave(query);
  setShowPreviewDialog(false);
  window.open(`/efi-code/${siteId}/preview`, '_blank');
};
```

### 6. Botão Salvar com Indicador

```typescript
<Button 
  size="sm" 
  variant={hasUnsavedChanges ? "default" : "outline"}
  onClick={handleSave}
  className={hasUnsavedChanges ? "relative" : ""}
>
  {hasUnsavedChanges && (
    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
  )}
  <Save className="h-4 w-4 mr-2" />
  {hasUnsavedChanges ? "Salvar*" : "Salvar"}
</Button>
```

### 7. Callback para Detectar Mudanças no Editor

O `EditorActions` já acessa `canUndo`. Precisamos propagar essa informação para o componente pai:

```typescript
// Props do EditorActions
interface EditorActionsProps {
  // ... props existentes ...
  onEditorChangeStatus?: (hasChanges: boolean) => void;
}

// Dentro de EditorActions
useEffect(() => {
  onEditorChangeStatus?.(canUndo);
}, [canUndo, onEditorChangeStatus]);
```

### 8. Reset das Refs após Salvar

```typescript
const handleSave = useCallback(async (query: any) => {
  // ... lógica existente de salvar ...
  
  // Após salvar com sucesso, resetar refs
  originalSiteNameRef.current = siteName;
  originalPageSettingsRef.current = pageSettings;
  setHasEditorChanges(false);
  
  // Limpar histórico do editor (opcional)
  // actions.history.clear();
}, [/* deps */]);
```

## Fluxo de Interação

```text
┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO EDITA ALGO                                              │
├─────────────────────────────────────────────────────────────────┤
│ → Nome do site muda                                             │
│ → Configurações de página mudam                                 │
│ → Blocos são adicionados/editados/removidos (canUndo = true)    │
│                                                                 │
│ ↓                                                               │
│                                                                 │
│ hasUnsavedChanges = true                                        │
│ → Botão "Salvar*" fica destacado com ponto laranja              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO CLICA EM VOLTAR (←) OU TENTA NAVEGAR                    │
├─────────────────────────────────────────────────────────────────┤
│ Se hasUnsavedChanges:                                           │
│ → useBlocker bloqueia navegação                                 │
│ → AlertDialog aparece: "Alterações não salvas"                  │
│   → [Cancelar] → volta ao editor                                │
│   → [Sair sem salvar] → navega para /efi-code                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO CLICA EM PRÉVIA                                         │
├─────────────────────────────────────────────────────────────────┤
│ Se hasUnsavedChanges:                                           │
│ → AlertDialog aparece: "Para visualizar, é preciso salvar"      │
│   → [Cancelar] → fecha diálogo                                  │
│   → [Salvar e Abrir] → salva e abre preview                     │
│                                                                 │
│ Se não há mudanças:                                             │
│ → Abre preview diretamente                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO FECHA ABA / ATUALIZA PÁGINA                             │
├─────────────────────────────────────────────────────────────────┤
│ Se hasUnsavedChanges:                                           │
│ → Navegador mostra alerta nativo: "Deseja sair?"                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO CLICA EM SALVAR                                         │
├─────────────────────────────────────────────────────────────────┤
│ → Site é salvo                                                  │
│ → Refs são atualizadas com valores atuais                       │
│ → hasUnsavedChanges = false                                     │
│ → Botão volta para estado normal "Salvar"                       │
└─────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

- Botão "Salvar" com indicador visual (ponto + asterisco) quando há alterações
- Ao tentar sair (navegação interna), diálogo pergunta se quer sair sem salvar
- Ao fechar/atualizar aba, navegador mostra alerta nativo
- Ao clicar em Preview com alterações, diálogo informa que precisa salvar primeiro
- Após salvar, todos os indicadores são resetados
