

## Plano: Corrigir Parser para Suportar Delimitador @container

### Problema Identificado

O formato real usa `@container">` como delimitador entre blocos, não apenas HTML seguido de JSON. A estrutura é:

```text
BLOCO 1: HTML...
         {JSON}

@container">   <-- Delimitador para próximo bloco

BLOCO 2: HTML...
         {JSON}

@container">   <-- Delimitador para próximo bloco

BLOCO 3: ...
```

O parser atual não reconhece esse delimitador e falha ao tentar processar.

---

### Solução Proposta

Modificar o `parseHtmlWithTrailingJson` para:
1. **Primeiro**, dividir o conteúdo por `@container">` (ou variantes)
2. **Depois**, processar cada parte como um par HTML + JSON

---

### Novo Algoritmo

```typescript
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Dividir por @container"> (delimitador entre blocos)
  // O primeiro split pode não ter o delimitador no início
  const rawSegments = content.split(/@container">\s*/);
  
  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    
    // Encontrar o JSON no final do segmento
    // Usa regex que suporta objetos aninhados (até 2 níveis)
    const jsonMatch = trimmed.match(/(\{[\s\S]*\})\s*$/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1];
      const jsonIndex = trimmed.lastIndexOf(jsonStr);
      let html = trimmed.slice(0, jsonIndex).trim();
      
      // Limpar comentários HTML
      html = html.replace(/<!--[\s\S]*?-->/g, '').trim();
      
      if (html && html.includes('<')) {
        let props = {};
        try {
          props = JSON.parse(jsonStr);
        } catch {
          // JSON inválido, usar HTML sem substituição
        }
        
        const finalHtml = replacePlaceholders(html, props);
        const blockIndex = blocks.length + 1;
        
        blocks.push({
          name: detectNameFromHtml(html, blockIndex),
          category: detectCategoryFromHtml(html),
          icon_name: detectIconFromHtml(html),
          html_content: finalHtml,
        });
      }
    } else if (trimmed.includes('<')) {
      // Sem JSON, apenas HTML
      const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (cleanHtml) {
        const blockIndex = blocks.length + 1;
        blocks.push({
          name: detectNameFromHtml(cleanHtml, blockIndex),
          category: detectCategoryFromHtml(cleanHtml),
          icon_name: detectIconFromHtml(cleanHtml),
          html_content: cleanHtml,
        });
      }
    }
  }
  
  return blocks;
};
```

---

### Fluxo de Processamento

```text
Entrada:
┌──────────────────────────────────────────────────────────────────┐
│ <section>...</section>                                          │
│ { "title": "Bloco 1" }                                          │
│                                                                  │
│ @container">                                                     │
│ <div>...</div>                                                   │
│ { "title": "Bloco 2" }                                           │
│                                                                  │
│ @container">                                                     │
│ <article>...</article>                                           │
│ { "title": "Bloco 3" }                                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ split("@container">")
┌──────────────────────────────────────────────────────────────────┐
│ Segment 1: <section>...</section> { "title": "Bloco 1" }         │
├──────────────────────────────────────────────────────────────────┤
│ Segment 2: <div>...</div> { "title": "Bloco 2" }                 │
├──────────────────────────────────────────────────────────────────┤
│ Segment 3: <article>...</article> { "title": "Bloco 3" }         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Para cada segmento
┌──────────────────────────────────────────────────────────────────┐
│ 1. Extrair JSON do final                                        │
│ 2. Extrair HTML de antes do JSON                                │
│ 3. Substituir [placeholders] pelos valores do JSON              │
│ 4. Detectar nome/categoria/ícone                                │
└──────────────────────────────────────────────────────────────────┘
```

---

### Variantes do Delimitador a Suportar

Para ser robusto, a regex de split deve capturar:
- `@container">`
- `@container" >`
- `@container">` com espaços antes/depois
- Apenas `@container` (sem aspas/chevron)

Regex sugerida:
```typescript
const rawSegments = content.split(/@container[^<]*(?:>|\s|$)/);
```

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Reescrever `parseHtmlWithTrailingJson` para usar split por `@container` |

---

### Código Final para parseHtmlWithTrailingJson

```typescript
// NEW: Parse HTML + JSON with @container"> delimiter
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Split by @container"> delimiter (and variations)
  // This handles: @container">, @container" >, @container (without quotes)
  const rawSegments = content.split(/@container[^<\n]*(?:>|\s|$)/i);
  
  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    
    // Find the last JSON object in this segment
    // Using lastIndexOf('{') approach to handle nested objects
    const lastBraceIndex = trimmed.lastIndexOf('}');
    if (lastBraceIndex === -1) {
      // No JSON, check if it's just HTML
      if (trimmed.includes('<')) {
        const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
        if (cleanHtml) {
          blocks.push({
            name: detectNameFromHtml(cleanHtml, blocks.length + 1),
            category: detectCategoryFromHtml(cleanHtml),
            icon_name: detectIconFromHtml(cleanHtml),
            html_content: cleanHtml,
          });
        }
      }
      continue;
    }
    
    // Find the matching opening brace for the JSON
    let braceCount = 0;
    let jsonStartIndex = -1;
    
    for (let i = lastBraceIndex; i >= 0; i--) {
      if (trimmed[i] === '}') braceCount++;
      if (trimmed[i] === '{') braceCount--;
      
      if (braceCount === 0) {
        jsonStartIndex = i;
        break;
      }
    }
    
    if (jsonStartIndex === -1) continue;
    
    const jsonStr = trimmed.slice(jsonStartIndex, lastBraceIndex + 1);
    let html = trimmed.slice(0, jsonStartIndex).trim();
    
    // Clean HTML comments
    html = html.replace(/<!--[\s\S]*?-->/g, '').trim();
    
    if (!html || !html.includes('<')) continue;
    
    let props = {};
    try {
      props = JSON.parse(jsonStr);
    } catch {
      // Invalid JSON, keep HTML without replacement
    }
    
    const finalHtml = replacePlaceholders(html, props);
    
    blocks.push({
      name: detectNameFromHtml(html, blocks.length + 1),
      category: detectCategoryFromHtml(html),
      icon_name: detectIconFromHtml(html),
      html_content: finalHtml,
    });
  }
  
  return blocks;
};
```

---

### Testes que Devem Passar

| Caso | Entrada | Resultado Esperado |
|------|---------|-------------------|
| 1 bloco simples | `<section>...</section> {json}` | 1 bloco |
| 2 blocos com delimitador | `<section>...</section> {json} @container"> <div>...</div> {json}` | 2 blocos |
| Múltiplos blocos | Seu formato atual | 4+ blocos |
| Sem JSON | `<section>...</section>` | 1 bloco (sem props) |
| JSON com nested objects | `{ "richContent": "<p>...</p>" }` | Funciona |

---

### Resultado Esperado

Após essa correção, ao colar seu conteúdo, deve aparecer:

```text
📦 Detectados: 4 blocos
   • Bloco 1 (layout) - Section com hero
   • Bloco 2 (layout) - Container com grid  
   • Bloco 3 (layout) - Cards grid
   • Bloco 4 (layout) - Section split
```

