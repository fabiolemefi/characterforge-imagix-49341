

## Plano: Corrigir Parser para Aceitar HTML Puro

### Problema Identificado

O fluxo do `parseContent` tem uma falha na **ordem de execução e tratamento de erros**:

```typescript
// Linha 313-321
const detectedBlocks = useMemo((): BlockImportData[] | null => {
  if (!content.trim()) return null;
  
  try {
    return parseContent(content);
  } catch {
    return null;  // ← ERRO SILENCIADO! Qualquer exceção = "nenhum bloco"
  }
}, [content]);
```

Qualquer erro dentro de `parseContent` ou suas subfunções retorna `null`, que mostra "Nenhum bloco detectado" - sem nenhuma informação sobre o que falhou.

Além disso, a condição do **bloco 2** interfere com o **bloco 4**:

```typescript
// Bloco 2 - linha 354
if (trimmed.includes('<') && trimmed.includes('{')) {
  // Se tem < e {, tenta parseHtmlWithTrailingJson
  // Se falhar, continua para próximo...
}

// Bloco 4 - linha 371
if (trimmed.startsWith('<')) {
  // HTML puro - DEVERIA funcionar
}
```

O HTML `<section class="px-[4.688rem]">` não tem `{`, então deveria ir direto para o bloco 4. **Mas algo está falhando silenciosamente.**

---

### Solução: Adicionar Logging + Corrigir Fluxo

#### 1. Adicionar console.log para diagnóstico

```typescript
const parseContent = (raw: string): BlockImportData[] => {
  const trimmed = raw.trim();
  console.log('[BlockImport] Input length:', trimmed.length);
  console.log('[BlockImport] Starts with <:', trimmed.startsWith('<'));
  console.log('[BlockImport] Contains {:', trimmed.includes('{'));
  
  // ... resto do código
  
  // Bloco 4
  if (trimmed.startsWith('<')) {
    console.log('[BlockImport] Trying raw HTML path');
    const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
    console.log('[BlockImport] Clean HTML length:', cleanHtml.length);
    
    if (cleanHtml) {
      const result = [{
        name: detectNameFromHtml(cleanHtml, 1),
        category: detectCategoryFromHtml(cleanHtml),
        icon_name: detectIconFromHtml(cleanHtml),
        html_content: cleanHtml,
      }];
      console.log('[BlockImport] Returning:', result);
      return result;
    }
  }
  
  console.log('[BlockImport] No path matched, throwing error');
  throw new Error('Formato não reconhecido.');
};
```

#### 2. Mostrar erro real ao invés de silenciar

```typescript
const detectedBlocks = useMemo((): BlockImportData[] | null => {
  if (!content.trim()) return null;
  
  try {
    return parseContent(content);
  } catch (error) {
    console.error('[BlockImport] Parse error:', error);
    return null;
  }
}, [content]);
```

---

### Hipótese Principal

Suspeito que a função `detectNameFromHtml` está lançando uma exceção para certos inputs, causando o retorno `null`.

A regex na linha 133:
```typescript
const classMatch = html.match(/<(?:section|div|article|header|footer)[^>]*class="([^"]+)"/i);
```

Para seu HTML:
```html
<section class="w-full py-16 lg:py-24 px-6 lg:px-[4.688rem] bg-gradient-to-b from-gray-800 to-gray-900"></section>
```

Isso deveria funcionar... Mas a classe tem `[4.688rem]` com colchetes, e depois na linha 136:

```typescript
if (firstClass && !firstClass.includes('[') && !firstClass.startsWith('w-') && !firstClass.startsWith('bg-')) {
```

A primeira classe é `w-full`, que **começa com `w-`**, então é descartada. Isso está OK, vai para o fallback `Bloco ${index}`.

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Adicionar logs de diagnóstico em `parseContent` e no `catch` do `useMemo` |

---

### Código Final com Diagnóstico

```typescript
// Linha 313-321 - Adicionar log no catch
const detectedBlocks = useMemo((): BlockImportData[] | null => {
  if (!content.trim()) return null;
  
  try {
    return parseContent(content);
  } catch (error) {
    console.error('[BlockImport] Parse error:', error);
    return null;
  }
}, [content]);

// Linha 323-384 - Adicionar logs em parseContent
const parseContent = (raw: string): BlockImportData[] => {
  const trimmed = raw.trim();
  
  console.log('[BlockImport] === Starting parse ===');
  console.log('[BlockImport] Length:', trimmed.length);
  console.log('[BlockImport] First 50 chars:', trimmed.slice(0, 50));
  console.log('[BlockImport] startsWith(<):', trimmed.startsWith('<'));
  console.log('[BlockImport] includes({):', trimmed.includes('{'));
  
  // 1. Try JSON first
  try {
    const parsed = JSON.parse(trimmed);
    console.log('[BlockImport] ✓ Parsed as JSON');
    // ... resto
  } catch {
    console.log('[BlockImport] ✗ Not valid JSON');
  }
  
  // 2. HTML + JSON interleaved
  if (trimmed.includes('<') && trimmed.includes('{')) {
    console.log('[BlockImport] Trying HTML+JSON path');
    const blocks = parseHtmlWithTrailingJson(trimmed);
    console.log('[BlockImport] HTML+JSON found:', blocks.length, 'blocks');
    if (blocks.length > 0) {
      return blocks;
    }
  }
  
  // 3. Block comments
  const hasBlockComments = /<!--[\s\S]*?BLOCO\s+\d+:/i.test(trimmed);
  console.log('[BlockImport] Has block comments:', hasBlockComments);
  if (hasBlockComments) {
    const blocks = parseMultipleBlocks(trimmed);
    console.log('[BlockImport] Comment blocks found:', blocks.length);
    if (blocks.length > 0) {
      return blocks;
    }
  }
  
  // 4. Raw HTML
  if (trimmed.startsWith('<')) {
    console.log('[BlockImport] Trying raw HTML path');
    const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
    console.log('[BlockImport] Clean HTML length:', cleanHtml.length);
    
    if (cleanHtml) {
      const name = detectNameFromHtml(cleanHtml, 1);
      const category = detectCategoryFromHtml(cleanHtml);
      const icon = detectIconFromHtml(cleanHtml);
      console.log('[BlockImport] Detected:', { name, category, icon });
      
      return [{
        name,
        category,
        icon_name: icon,
        html_content: cleanHtml,
      }];
    }
  }
  
  console.log('[BlockImport] No path matched!');
  throw new Error('Formato não reconhecido. Cole HTML ou JSON válido.');
};
```

---

### Próximos Passos

1. Implementar os logs acima
2. Testar novamente com o HTML simples
3. Verificar console do navegador para ver exatamente onde falha
4. Corrigir o bug específico baseado nos logs

---

### Resultado Esperado

Com os logs, veremos exatamente:
- Qual caminho está sendo tentado
- Se há algum erro silencioso
- Por que o bloco 4 (HTML puro) não está funcionando

