
# Plano: Modo de Substituição - Todas ou Individual

## Objetivo

Adicionar opção para o usuário escolher entre:
1. **Substituir todas** - comportamento atual (uma imagem para todos os breakpoints)
2. **Substituir individual** - expandir o grupo mostrando cada source/breakpoint separadamente

## Mudanças na Interface

### Novo Layout para Grupos com Múltiplos Sources

```
┌─────────────────────────────────────────────┐
│  [Imagem Preview]        [5 tamanhos ▾]    │
│                                             │
│  [Trocar todas]   [Expandir individuais]    │
└─────────────────────────────────────────────┘
```

### Quando "Expandir individuais" é clicado:

```
┌─────────────────────────────────────────────┐
│  ▼ Imagem Responsiva (5 tamanhos)           │
├─────────────────────────────────────────────┤
│  360px     [thumb]  [Trocar]                │
│  992px     [thumb]  [Trocar]                │
│  1366px    [thumb]  [Trocar]                │
│  1920px    [thumb]  [Trocar]                │
│  Fallback  [thumb]  [Trocar]                │
├─────────────────────────────────────────────┤
│  [Trocar todas de uma vez]                  │
└─────────────────────────────────────────────┘
```

## Implementação Técnica

### Arquivo: `src/components/eficode/editor/SettingsPanel.tsx`

#### 1. Novo Estado para Controlar Expansão

```typescript
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

const toggleGroupExpansion = (groupId: string) => {
  setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    return next;
  });
};
```

#### 2. Novo Estado para Edição de Source Individual

```typescript
// Atualizar editingGroup para suportar source individual
const [editingSource, setEditingSource] = useState<ImageSource | null>(null);
```

#### 3. Nova Função de Substituição Individual

```typescript
const replaceSingleSource = (html: string, source: ImageSource, newSrc: string): string => {
  const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  if (source.tagType === 'source') {
    const regex = new RegExp(`(<source[^>]*srcset=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    return html.replace(regex, `$1${newSrc}$2`);
  } else {
    const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    return html.replace(regex, `$1${newSrc}$2`);
  }
};
```

#### 4. Atualizar handleImageSelect

```typescript
const handleImageSelect = (image: { url: string; name?: string }) => {
  if (selectedBlock) {
    let newHtml = selectedBlock.html;
    let message = 'Imagem atualizada!';
    
    if (editingSource) {
      // Substituição individual
      newHtml = replaceSingleSource(selectedBlock.html, editingSource, image.url);
      const breakpoint = editingSource.media || 'fallback';
      message = `Imagem ${breakpoint} atualizada!`;
    } else if (editingGroup) {
      // Substituição de todas
      newHtml = replaceImageGroup(selectedBlock.html, editingGroup, image.url);
      // ... mensagens existentes
    }
    
    if (newHtml !== selectedBlock.html) {
      updateBlockHtml(selectedBlock.id, newHtml);
      toast.success(message);
    }
  }
  
  setImagePickerOpen(false);
  setEditingGroup(null);
  setEditingSource(null);
};
```

#### 5. Nova UI para Grupo Expandido

```tsx
{imageGroups.map((group) => {
  const isExpanded = expandedGroups.has(group.id);
  const hasMultipleSources = group.sources.length > 1;
  
  return (
    <div key={group.id} className="border rounded-md overflow-hidden bg-secondary/50">
      {/* Header com preview e badges */}
      <div className="relative p-2">
        {getTypeBadge(group)}
        
        <div className="flex items-center gap-2">
          <img 
            src={group.previewSrc} 
            className="w-12 h-12 object-contain rounded"
          />
          
          <div className="flex-1 text-xs text-muted-foreground">
            {hasMultipleSources ? (
              <span>{group.sources.length} tamanhos</span>
            ) : (
              <span>Imagem única</span>
            )}
          </div>
          
          {hasMultipleSources && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleGroupExpansion(group.id)}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          )}
        </div>
        
        {/* Botão para trocar todas */}
        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-2"
          onClick={() => openImagePicker(group)}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          {hasMultipleSources ? 'Trocar todas' : 'Trocar'}
        </Button>
      </div>
      
      {/* Lista expandida de sources individuais */}
      {isExpanded && hasMultipleSources && (
        <div className="border-t bg-background/50 p-2 space-y-2">
          {group.sources.map((source, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2 p-1.5 rounded bg-secondary/30"
            >
              <img 
                src={source.src}
                className="w-8 h-8 object-contain rounded"
              />
              
              <span className="flex-1 text-xs font-medium">
                {source.media || (source.tagType === 'img' ? 'Fallback (>1920px)' : `Breakpoint ${idx + 1}`)}
              </span>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSource(source);
                  setEditingGroup(group);
                  setImagePickerOpen(true);
                }}
              >
                Trocar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
})}
```

## Fluxo de Uso

### Cenário 1: Trocar Todas (Comportamento Padrão)
```
1. Usuário vê grupo com badge "5 tamanhos"
2. Clica em "Trocar todas"
3. Seleciona imagem
4. TODAS as sources são atualizadas com a mesma imagem
```

### Cenário 2: Trocar Individual
```
1. Usuário vê grupo com badge "5 tamanhos"
2. Clica no botão de expandir (▼)
3. Vê lista de breakpoints: 360px, 992px, 1366px, 1920px, Fallback
4. Clica em "Trocar" no breakpoint específico (ex: 360px)
5. Seleciona imagem otimizada para mobile
6. APENAS a source de 360px é atualizada
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Substituição em massa | Sim | Sim (padrão) |
| Substituição individual | Não | Sim (expansível) |
| Otimização por breakpoint | Não | Sim |
| Complexidade UI | Simples | Progressiva (simples → detalhada) |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Adicionar estados de expansão, UI expandida, substituição individual |

## Ícones Necessários

Adicionar ao import do lucide-react:
- `ChevronDown`
- `ChevronUp`
