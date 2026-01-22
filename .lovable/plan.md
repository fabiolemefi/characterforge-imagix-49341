

## Plano: Corrigir Parser para Não Quebrar HTML Interno

### Problema Identificado

O parser atual usa `split(@container)` que **corta o HTML interno** do bloco:

```text
Entrada:
<section class="...">
  <div class="@container">    ← @container está DENTRO do HTML!
    ...
  </div>
</section>
{ json }

O que o split faz:
Parte 1: <section class="..."> <div class="
Parte 2: ">...              ← HTML quebrado!
```

O `@container` é uma classe CSS de Container Queries, não um delimitador entre blocos!

---

### Solução: Detectar JSON como Delimitador

Em vez de usar `@container` como separador, o parser deve:
1. Encontrar todos os objetos JSON de nível superior
2. Usar o texto **antes** de cada JSON como o HTML do bloco

---

### Novo Algoritmo

```typescript
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Encontrar todos os objetos JSON de nível superior no conteúdo
  // Um JSON de nível superior começa com { no início de uma linha (ou após fechar >)
  const jsonPositions: { start: number; end: number; json: string }[] = [];
  
  let i = 0;
  while (i < content.length) {
    // Procurar por { que não está dentro de uma string ou tag HTML
    if (content[i] === '{') {
      // Verificar se é início de JSON (não dentro de class="..." ou style="...")
      const before = content.slice(Math.max(0, i - 50), i);
      const isInsideAttribute = /[=]\s*["'][^"']*$/i.test(before);
      
      if (!isInsideAttribute) {
        // Contar chaves para encontrar o fim do JSON
        let braceCount = 0;
        let jsonEnd = i;
        
        for (let j = i; j < content.length; j++) {
          if (content[j] === '{') braceCount++;
          if (content[j] === '}') braceCount--;
          
          if (braceCount === 0) {
            jsonEnd = j + 1;
            break;
          }
        }
        
        const jsonStr = content.slice(i, jsonEnd);
        
        // Validar se é JSON válido
        try {
          JSON.parse(jsonStr);
          jsonPositions.push({ start: i, end: jsonEnd, json: jsonStr });
          i = jsonEnd;
          continue;
        } catch {
          // Não é JSON válido, continuar
        }
      }
    }
    i++;
  }
  
  // Agora processar: HTML antes de cada JSON
  let lastEnd = 0;
  for (const { start, end, json } of jsonPositions) {
    const html = content.slice(lastEnd, start).trim();
    
    if (html && html.includes('<')) {
      // Limpar comentários HTML
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
  
  // Verificar se sobrou HTML após o último JSON
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

### Fluxo de Processamento Corrigido

```text
Entrada:
┌──────────────────────────────────────────────────────────────────┐
│ <section class="...">                                           │
│   <div class="@container">                                       │
│     ...                                                          │
│   </div>                                                         │
│ </section>                                                       │
│ {                                                                │
│   "sectionBg": "bg-gradient-to-b...",                           │
│   ...                                                            │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Encontrar posições de JSON
┌──────────────────────────────────────────────────────────────────┐
│ JSON encontrado: posição 150-400                                │
│ → HTML é tudo de 0 até 150                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Processar
┌──────────────────────────────────────────────────────────────────┐
│ 1. HTML = conteúdo antes do JSON (0-150)                        │
│ 2. Props = JSON parseado                                         │
│ 3. Substituir [placeholders] no HTML                            │
│ 4. Criar bloco                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

### Diferencial da Verificação

A chave é esta verificação:

```typescript
const before = content.slice(Math.max(0, i - 50), i);
const isInsideAttribute = /[=]\s*["'][^"']*$/i.test(before);
```

Isso detecta se a `{` está dentro de um atributo HTML como:
- `class="{...}"` → Ignorar (não é JSON)
- `style="{...}"` → Ignorar (não é JSON)
- `{...}` sozinho após `>` ou após fechar tag → É JSON!

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Reescrever `parseHtmlWithTrailingJson` para usar detecção de JSON em vez de split por `@container` |

---

### Testes que Devem Passar

| Caso | Entrada | Resultado |
|------|---------|-----------|
| 1 bloco com @container interno | Seu exemplo atual | 1 bloco detectado |
| 2 blocos separados | `<section>...</section>{json}<div>...</div>{json}` | 2 blocos |
| HTML com chaves em class | `class="grid-{cols}"` | Não confunde com JSON |
| JSON com HTML interno | `{ "content": "<p>...</p>" }` | JSON parseado corretamente |

---

### Resultado Esperado

Após essa correção:

```text
📦 Detectados: 1 bloco
   • Bloco 1 (layout)
```

O HTML completo (incluindo `<div class="@container">`) será preservado e os placeholders `[sectionBg]`, `[mainTitle]`, etc. serão substituídos pelos valores do JSON.

