

## Plano: Corrigir Erro de Hoisting - parseContent

### Problema Identificado

```typescript
// Linha 313 - useMemo é definido PRIMEIRO
const detectedBlocks = useMemo(() => {
  return parseContent(content);  // ❌ parseContent ainda não existe!
}, [content]);

// Linha 324 - parseContent é definida DEPOIS
const parseContent = (raw: string) => { ... };
```

Em JavaScript, `const` não sofre hoisting como `function`. Quando o componente renderiza, o `useMemo` tenta acessar `parseContent` antes dela ser inicializada.

---

### Solução: Mover parseContent para ANTES do useMemo

A correção é simples: mover a definição de `parseContent` para **antes** do `useMemo` que a utiliza.

---

### Alteração no Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Mover `parseContent` (linhas 324-405) para antes do `useMemo` (linha 313) |

---

### Código Corrigido

```typescript
export const BlockImportModal = ({ open, onOpenChange, onImport }: BlockImportModalProps) => {
  const [content, setContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // ✅ PRIMEIRO: Definir parseContent
  const parseContent = (raw: string): BlockImportData[] => {
    const trimmed = raw.trim();
    
    console.log('[BlockImport] === Starting parse ===');
    // ... resto da função
  };

  // ✅ DEPOIS: Usar no useMemo
  const detectedBlocks = useMemo((): BlockImportData[] | null => {
    if (!content.trim()) return null;
    
    try {
      return parseContent(content);
    } catch (error) {
      console.error('[BlockImport] Parse error:', error);
      return null;
    }
  }, [content]);

  // ... resto do componente
};
```

---

### Alternativa: Usar useCallback

Outra opção seria envolver `parseContent` em `useCallback` para garantir estabilidade:

```typescript
const parseContent = useCallback((raw: string): BlockImportData[] => {
  // ... implementação
}, []);

const detectedBlocks = useMemo(() => {
  if (!content.trim()) return null;
  try {
    return parseContent(content);
  } catch (error) {
    console.error('[BlockImport] Parse error:', error);
    return null;
  }
}, [content, parseContent]);
```

---

### Resultado Esperado

Após mover `parseContent` para antes do `useMemo`:

1. O erro "Cannot access 'parseContent' before initialization" desaparece
2. Os logs de diagnóstico começam a aparecer no console
3. Podemos finalmente ver onde o parser está falhando (ou se está funcionando)

