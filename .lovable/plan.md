

## Plano: Parser Simplificado - HTML + JSON sem Comentários

### Nova Lógica de Detecção

Em vez de procurar comentários, o parser vai:
1. Encontrar cada tag HTML de abertura (`<section`, `<div`, etc.)
2. Capturar todo o HTML até o fechamento correspondente
3. Capturar o JSON que vem logo após (se existir)
4. Repetir para cada bloco encontrado

---

### Formato Esperado (Simplificado)

```html
<section class="w-full [sectionClass]">
  <h1>[title]</h1>
  <p>[description]</p>
</section>
{
  "sectionClass": "bg-white",
  "title": "Título Principal",
  "description": "Descrição aqui"
}

<div class="grid [gridClass]">
  ...
</div>
{
  "gridClass": "grid-cols-3"
}
```

---

### Algoritmo Proposto

```typescript
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Regex: Captura uma tag HTML completa seguida de um JSON opcional
  // Suporta: <section>...</section>, <div>...</div>, etc.
  const blockPattern = /(<(?:section|div|article|header|footer|main|aside|nav)[^>]*>[\s\S]*?<\/\1>)\s*(\{[\s\S]*?\})?/gi;
  
  // Alternativa mais robusta: dividir por objetos JSON
  // Encontrar todos os blocos JSON e usar como separadores
  const jsonBlocks = content.match(/\{[\s\S]*?\}\s*(?=<|$)/g) || [];
  
  // Dividir o conteúdo pelos JSONs encontrados
  let remaining = content;
  let blockIndex = 0;
  
  for (const jsonStr of jsonBlocks) {
    const jsonIndex = remaining.indexOf(jsonStr);
    if (jsonIndex === -1) continue;
    
    // HTML é tudo antes do JSON
    const html = remaining.slice(0, jsonIndex).trim();
    
    if (html) {
      let props = {};
      try {
        props = JSON.parse(jsonStr);
      } catch {}
      
      const finalHtml = replacePlaceholders(html, props);
      
      blocks.push({
        name: `Bloco ${++blockIndex}`,
        category: detectCategoryFromHtml(html),
        icon_name: detectIconFromHtml(html),
        html_content: finalHtml,
      });
    }
    
    // Avançar para depois do JSON
    remaining = remaining.slice(jsonIndex + jsonStr.length).trim();
  }
  
  // Se sobrou HTML sem JSON, importar como bloco
  if (remaining.trim().startsWith('<')) {
    blocks.push({
      name: `Bloco ${++blockIndex}`,
      category: 'layout',
      icon_name: 'Code',
      html_content: remaining.trim(),
    });
  }
  
  return blocks;
};
```

---

### Detecção de Categoria pelo HTML

```typescript
const detectCategoryFromHtml = (html: string): string => {
  const lower = html.toLowerCase();
  if (lower.includes('hero') || lower.includes('banner')) return 'layout';
  if (lower.includes('grid') || lower.includes('card')) return 'layout';
  if (lower.includes('<h1') || lower.includes('<h2')) return 'text';
  if (lower.includes('<img') || lower.includes('image')) return 'media';
  if (lower.includes('<button') || lower.includes('<form')) return 'interactive';
  return 'layout';
};
```

---

### Detecção de Nome pelo HTML

```typescript
const detectNameFromHtml = (html: string, index: number): string => {
  // Tentar extrair nome de classes ou IDs
  const classMatch = html.match(/class="([^"]+)"/i);
  if (classMatch) {
    const firstClass = classMatch[1].split(' ')[0];
    if (firstClass && !firstClass.includes('[')) {
      return formatBlockName(firstClass.replace(/-/g, ' '));
    }
  }
  
  const idMatch = html.match(/id="([^"]+)"/i);
  if (idMatch) {
    return formatBlockName(idMatch[1].replace(/-/g, ' '));
  }
  
  return `Bloco ${index}`;
};
```

---

### Fluxo de Parsing Atualizado

```text
┌──────────────────────────────────────────────────────────────────┐
│  Entrada: HTML + JSON intercalados (sem comentários)            │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. Encontrar todos os blocos JSON no texto                     │
│     Regex: /\{[\s\S]*?\}\s*(?=<|$)/g                             │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Para cada JSON encontrado:                                  │
│     a. Extrair HTML que vem ANTES do JSON                       │
│     b. Parsear o JSON como props                                │
│     c. Substituir [placeholders] no HTML                        │
│     d. Detectar nome/categoria/ícone do HTML                    │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Retornar array de blocos prontos                            │
└──────────────────────────────────────────────────────────────────┘
```

---

### Prioridade de Parsing (Ordem)

1. **JSON puro** - Manter retrocompatibilidade com formato atual
2. **HTML + JSON intercalado** - Novo formato simplificado (prioridade)
3. **Comentários BLOCO** - Fallback para formato antigo (opcional)
4. **HTML puro** - Sem props, importar direto

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Adicionar `parseHtmlWithTrailingJson` e atualizar ordem de prioridade no `parseContent` |

---

### Vantagens do Novo Formato

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Comentários | Obrigatórios (`<!-- BLOCO X -->`) | Não precisa |
| Regex | Complexa, multi-linha | Simples, baseada em JSON |
| Manutenção | Difícil (regex frágil) | Fácil (split por JSON) |
| Erro humano | Alto (formato estrito) | Baixo (formato flexível) |

---

### Exemplo de Importação

**Entrada:**
```html
<section class="hero-section">
  <h1>[title]</h1>
</section>
{
  "title": "Bem-vindo"
}

<div class="feature-grid">
  <p>[text]</p>
</div>
{
  "text": "Recursos incríveis"
}
```

**Saída detectada:**
```text
📦 Detectados: 2 blocos
   • Hero Section (layout)
   • Feature Grid (layout)
```

