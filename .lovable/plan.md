

# Plano: Preservar Props Dinâmicas em Blocos HTML

## Diagnóstico

O sistema atual "achata" as props na hora da importação, substituindo placeholders `[key]` diretamente no HTML. Isso causa dois problemas:

1. **Na importação**: `replacePlaceholders()` substitui `[sectionBg]` → `"bg-gray-800"` no HTML
2. **No Toolbox**: `getComponent()` ignora `default_props` ao criar HtmlBlocks

Resultado: o bloco funciona visualmente, mas não é configurável no painel de Settings.

---

## Solução Proposta

### Opção A: Preservar template + props separados (Recomendado)

Manter o HTML com placeholders como "template" e salvar as props separadamente para edição posterior.

| Arquivo | Alteração |
|---------|-----------|
| `BlockImportModal.tsx` | Salvar `html_content` COM placeholders, salvar props em `default_props` |
| `Toolbox.tsx` | Passar `default_props` para o HtmlBlock |
| `HtmlBlock.tsx` | Aceitar props dinâmicas e substituir placeholders em runtime |
| `HtmlBlockSettings.tsx` | Gerar campos de edição baseados nas props |

---

### Fluxo Corrigido

```text
1. IMPORTAÇÃO
   Input: HTML + JSON
   ┌─────────────────────────────────────────┐
   │ <section class="[sectionBg]">...</section>
   │ { "sectionBg": "bg-gray-800" }
   └─────────────────────────────────────────┘
   
   Salvar no banco:
   - html_content: <section class="[sectionBg]">...</section>  (com placeholders)
   - default_props: { "sectionBg": "bg-gray-800" }

2. TOOLBOX
   Ao arrastar, criar com props:
   <HtmlBlock 
     html={block.html_content} 
     dynamicProps={block.default_props}
   />

3. RENDERIZAÇÃO (HtmlBlock)
   Substituir placeholders em runtime:
   html.replace(/\[sectionBg\]/g, props.sectionBg)

4. SETTINGS
   Gerar inputs dinamicamente baseado nas props
```

---

## Arquivos a Modificar

### 1. `src/components/eficode/BlockImportModal.tsx`

**Alteração**: NÃO substituir placeholders na importação

```typescript
// ANTES (linha 294)
const finalHtml = replacePlaceholders(html, props);
blocks.push({
  html_content: finalHtml,  // Props já substituídas
});

// DEPOIS
blocks.push({
  html_content: html,        // Manter template com [placeholders]
  default_props: props,      // Salvar props separadamente
});
```

### 2. `src/components/eficode/editor/Toolbox.tsx`

**Alteração**: Passar props para HtmlBlock

```typescript
// ANTES (linha 181-182)
if (block.html_content) {
  return <HtmlBlock html={block.html_content} />;
}

// DEPOIS
if (block.html_content) {
  return <HtmlBlock 
    htmlTemplate={block.html_content} 
    {...(block.default_props || {})} 
  />;
}
```

### 3. `src/components/eficode/user-components/HtmlBlock.tsx`

**Alteração**: Aceitar props dinâmicas e substituir em runtime

```typescript
interface HtmlBlockProps {
  htmlTemplate: string;      // Template com [placeholders]
  className?: string;
  [key: string]: any;        // Props dinâmicas
}

export const HtmlBlock = ({ htmlTemplate, className = '', ...dynamicProps }: HtmlBlockProps) => {
  // Substituir placeholders em runtime
  const renderedHtml = useMemo(() => {
    let result = htmlTemplate;
    for (const [key, value] of Object.entries(dynamicProps)) {
      if (key !== 'className') {
        result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), String(value ?? ''));
      }
    }
    return result;
  }, [htmlTemplate, dynamicProps]);

  return (
    <div
      ref={...}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

HtmlBlock.craft = {
  displayName: 'Bloco HTML',
  props: {
    htmlTemplate: '<div>Seu HTML</div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
```

### 4. `src/components/eficode/user-components/HtmlBlock.tsx` (Settings)

**Alteração**: Gerar campos dinamicamente

```typescript
export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  // Extrair placeholders do template
  const placeholders = useMemo(() => {
    const matches = nodeProps.htmlTemplate?.match(/\[([^\]]+)\]/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }, [nodeProps.htmlTemplate]);

  return (
    <div className="space-y-4">
      {/* Campo para editar o template */}
      <div className="space-y-2">
        <Label>Código HTML</Label>
        <Textarea
          value={nodeProps.htmlTemplate}
          onChange={(e) => setProp((props: any) => props.htmlTemplate = e.target.value)}
        />
      </div>

      {/* Campos dinâmicos para cada placeholder */}
      {placeholders.map((key) => (
        <div key={key} className="space-y-2">
          <Label>{key}</Label>
          <Input
            value={nodeProps[key] || ''}
            onChange={(e) => setProp((props: any) => props[key] = e.target.value)}
          />
        </div>
      ))}

      {/* Campo de classes */}
      <div className="space-y-2">
        <Label>Classes CSS</Label>
        <Input
          value={nodeProps.className}
          onChange={(e) => setProp((props: any) => props.className = e.target.value)}
        />
      </div>
    </div>
  );
};
```

---

## Migração de Dados Existentes

Blocos já salvos no banco têm HTML com placeholders já substituídos. Para preservar compatibilidade:

```typescript
// Em HtmlBlock, aceitar tanto 'html' quanto 'htmlTemplate'
const template = htmlTemplate || html;  // Fallback para formato antigo
```

---

## Resultado Esperado

1. **Importação**: HTML mantém `[placeholders]`, props são salvas em `default_props`
2. **Toolbox**: Ao arrastar, bloco recebe template + props dinâmicas
3. **Editor**: Clicar no bloco mostra campos para editar cada prop
4. **Preview/Export**: Placeholders são substituídos em runtime para gerar HTML final

---

## Considerações Técnicas

- **Performance**: `useMemo` garante que substituição só ocorre quando props mudam
- **Flexibilidade**: Novos placeholders são detectados automaticamente do template
- **Compatibilidade**: Formato antigo (`html` sem placeholders) continua funcionando
- **UX**: Settings mostra campos intuitivos para cada variável do template

