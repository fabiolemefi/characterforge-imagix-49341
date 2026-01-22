

## Plano: Corrigir Falso Positivo na Detecção de JSON

### Problema Real Identificado

A regex `/[=]\s*["'][^"']*$/i` na linha 175 está causando **falsos positivos**. 

Quando o HTML contém `[sectionBg]` (ou qualquer texto com colchetes) antes do JSON, a regex pode interpretar incorretamente que o `{` está dentro de um atributo HTML.

**Exemplo do problema:**

```html
<section class="w-full py-16 [sectionBg]">
  ...
</section>
{
  "sectionBg": "bg-gray-800"
}
```

Os últimos 100 caracteres antes do `{` do JSON podem conter fragmentos que parecem atributos HTML incompletos, fazendo a regex retornar `true` e **pular** o JSON válido.

---

### Diagnóstico com Logs

Para confirmar, precisamos adicionar logs temporários ou mudar a lógica de detecção.

A verificação atual olha apenas os últimos 100 caracteres:
```typescript
const before = content.slice(Math.max(0, i - 100), i);
const isInsideAttribute = /[=]\s*["'][^"']*$/i.test(before);
```

Mas isso não é suficiente para detectar corretamente se estamos dentro de uma string ou atributo.

---

### Solução Proposta: Melhorar a Detecção de JSON Top-Level

Em vez de usar uma heurística baseada em "olhar para trás", devemos:

1. **Verificar se o `{` está no início de uma nova linha** (após whitespace/newlines)
2. **OU** se o `{` vem logo após o fechamento de uma tag HTML (`>`)

```typescript
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  const jsonPositions: { start: number; end: number; json: string }[] = [];
  
  let i = 0;
  while (i < content.length) {
    if (content[i] === '{') {
      // Check if this looks like a top-level JSON object
      const before = content.slice(Math.max(0, i - 20), i);
      
      // A top-level JSON typically:
      // 1. Is preceded by whitespace/newlines only (after HTML ends)
      // 2. Or comes right after a closing tag >
      // 3. Or is at the start of the content
      const isLikelyTopLevelJson = 
        i === 0 || 
        /^[\s\n\r]*$/.test(before.slice(-10)) ||  // Only whitespace before
        />\s*$/.test(before);  // Ends with > and optional whitespace
      
      if (isLikelyTopLevelJson) {
        // Count braces to find the complete JSON object
        let braceCount = 0;
        let jsonEnd = i;
        let inString = false;
        let escapeNext = false;
        
        for (let j = i; j < content.length; j++) {
          const char = content[j];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\' && inString) {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            
            if (braceCount === 0) {
              jsonEnd = j + 1;
              break;
            }
          }
        }
        
        const jsonStr = content.slice(i, jsonEnd);
        
        // Validate if it's valid JSON
        try {
          JSON.parse(jsonStr);
          jsonPositions.push({ start: i, end: jsonEnd, json: jsonStr });
          i = jsonEnd;
          continue;
        } catch {
          // Not valid JSON, continue
        }
      }
    }
    i++;
  }
  
  // Process: HTML before each JSON becomes a block
  let lastEnd = 0;
  for (const { start, end, json } of jsonPositions) {
    const html = content.slice(lastEnd, start).trim();
    
    if (html && html.includes('<')) {
      const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '').trim();
      
      if (cleanHtml) {
        let props = {};
        try {
          props = JSON.parse(json);
        } catch {}
        
        const finalHtml = replacePlaceholders(cleanHtml, props);
        
        blocks.push({
          name: detectNameFromHtml(cleanHtml, blocks.length + 1),
          category: detectCategoryFromHtml(cleanHtml),
          icon_name: detectIconFromHtml(cleanHtml),
          html_content: finalHtml,
        });
      }
    }
    
    lastEnd = end;
  }
  
  // Handle remaining HTML after last JSON
  const remaining = content.slice(lastEnd).trim();
  if (remaining && remaining.includes('<')) {
    const cleanHtml = remaining.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (cleanHtml) {
      blocks.push({
        name: detectNameFromHtml(cleanHtml, blocks.length + 1),
        category: detectCategoryFromHtml(cleanHtml),
        icon_name: detectIconFromHtml(cleanHtml),
        html_content: cleanHtml,
      });
    }
  }
  
  return blocks;
};
```

---

### Mudança Chave

**Antes** (problemático):
```typescript
const isInsideAttribute = /[=]\s*["'][^"']*$/i.test(before);
if (!isInsideAttribute && !isTemplateExpression) {
```

**Depois** (corrigido):
```typescript
const isLikelyTopLevelJson = 
  i === 0 || 
  /^[\s\n\r]*$/.test(before.slice(-10)) ||  // Only whitespace before
  />\s*$/.test(before);  // Ends with > and optional whitespace

if (isLikelyTopLevelJson) {
```

---

### Por que funciona

O JSON do bloco sempre vem:
- Após o fechamento do HTML (`</section>` ou similar)
- Separado por quebras de linha/espaços

A nova lógica detecta isso verificando se os últimos 10 caracteres antes do `{` são apenas whitespace, ou se termina com `>`.

---

### Arquivo a Modificar

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | 166-227 | Substituir lógica de detecção de JSON |

---

### Teste Esperado

Após essa correção, seu bloco:

```html
<section class="w-full py-16 lg:py-24 px-6 lg:px-[4.688rem] [sectionBg]">
  <div class="@container">
    ...
  </div>
</section>
{
  "sectionBg": "bg-gradient-to-b from-gray-800 to-gray-900",
  ...
}
```

Deve resultar em:

```text
📦 Detectados: 1 bloco
   • Bloco 1 (layout)
```

