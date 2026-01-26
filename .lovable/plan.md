

# Plano: Exportar Configurações da Página e Remover Editabilidade

## Problemas Identificados

### Problema 1: Configurações de Fundo Não Exportadas

A função `generateFullHtml` recebe `pageSettings` mas **não aplica** as configurações visuais:
- `backgroundColor` - Cor de fundo
- `backgroundImage` - Imagem de fundo
- `backgroundSize`, `backgroundPosition`, `backgroundAttachment`, `backgroundRepeat` - Propriedades da imagem
- `containerMaxWidth` - Largura máxima do container

O template atual apenas exporta `<body>` sem nenhum estilo inline.

### Problema 2: HTML Exportado Editável

Os blocos HTML podem conter atributos `contenteditable="true"` residuais se foram editados no editor. Precisamos sanitizar o HTML removendo esses atributos antes de exportar.

## Solução

### Parte 1: Aplicar Configurações de Fundo no Body

Modificar `src/lib/efiCodeHtmlGenerator.ts` para gerar estilos inline no `<body>`:

```typescript
// Gerar estilos do body baseado em pageSettings
const bodyStyles = [
  `background-color: ${pageSettings.backgroundColor || '#ffffff'}`,
  `min-height: 100vh`,
  `margin: 0`,
  `padding: 0`,
];

// Adicionar imagem de fundo se existir
if (pageSettings.backgroundImage) {
  bodyStyles.push(
    `background-image: url('${pageSettings.backgroundImage}')`,
    `background-size: ${pageSettings.backgroundSize || 'cover'}`,
    `background-position: ${pageSettings.backgroundPosition || 'center'}`,
    `background-attachment: ${pageSettings.backgroundAttachment || 'scroll'}`,
    `background-repeat: ${pageSettings.backgroundRepeat || 'no-repeat'}`
  );
}

// Gerar container wrapper
const containerStyles = `max-width: ${pageSettings.containerMaxWidth || '1200'}px; margin: 0 auto;`;
```

**Template Atualizado:**
```html
<body style="${bodyStyles.join('; ')}">
  <div style="${containerStyles}">
    ${bodyContent}
  </div>
</body>
```

### Parte 2: Sanitizar HTML Exportado

Adicionar função para remover atributos de edição:

```typescript
const sanitizeHtmlForExport = (html: string): string => {
  return html
    .replace(/\s*contenteditable=["'][^"']*["']/gi, '')
    .replace(/\s*data-gramm=["'][^"']*["']/gi, '')
    .replace(/\s*data-gramm_editor=["'][^"']*["']/gi, '')
    .replace(/\s*spellcheck=["'][^"']*["']/gi, '');
};
```

Aplicar essa sanitização no retorno do `HtmlBlock` no `generateHtmlFromNodes`:

```typescript
case 'HtmlBlock':
case 'Bloco HTML':
  const rawHtml = props.htmlTemplate || props.html || '';
  return sanitizeHtmlForExport(rawHtml);
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/efiCodeHtmlGenerator.ts` | Aplicar estilos do body/container e sanitizar HTML |

## Resultado Esperado

### HTML Exportado Antes (Problemático):
```html
<body>
  <div contenteditable="true">Texto editável...</div>
</body>
```

### HTML Exportado Depois (Correto):
```html
<body style="background-color: #1d1d1d; min-height: 100vh; margin: 0; padding: 0;">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div>Texto não editável...</div>
  </div>
</body>
```

## Fluxo Completo de Exportação

```text
┌─────────────────────────────────────────────────────┐
│ 1. Usuário configura no painel esquerdo:           │
│    - Cor de fundo: #1d1d1d                         │
│    - Largura máxima: 1200px                        │
│    - Imagem de fundo (opcional)                    │
│    - SEO, Analytics, etc.                          │
├─────────────────────────────────────────────────────┤
│ 2. Usuário clica em "Exportar HTML"               │
├─────────────────────────────────────────────────────┤
│ 3. generateFullHtml recebe pageSettings            │
├─────────────────────────────────────────────────────┤
│ 4. Função aplica configurações:                    │
│    - Body: background-color, background-image...   │
│    - Container: max-width, margin auto             │
│    - Head: title, meta, scripts                    │
│    - Sanitiza HTML removendo contenteditable       │
├─────────────────────────────────────────────────────┤
│ 5. HTML final exportado com todas as configurações │
└─────────────────────────────────────────────────────┘
```

