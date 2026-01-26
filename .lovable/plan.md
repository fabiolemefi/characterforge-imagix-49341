
# Plano: Corrigir Exportação HTML do Efi Code

## Problema Identificado

Ao exportar o HTML, o conteúdo dos blocos `HtmlBlock` não está sendo incluído porque a função `generateHtmlFromNodes` não tem um caso específico para este tipo de componente.

### Diagnóstico Técnico

```text
Função: generateHtmlFromNodes (src/lib/efiCodeHtmlGenerator.ts)

Switch cases existentes:
- Container ✓
- Heading ✓
- Text ✓
- Button ✓
- Image ✓
- Divider ✓
- Spacer ✓
- HtmlBlock ✗ (FALTANDO!)

Quando o tipo é 'HtmlBlock', cai no default:
  return allChildrenHtml; // <- vazio para HtmlBlock!
```

O `HtmlBlock` armazena seu conteúdo na prop `htmlTemplate` ou `html`, mas a função de exportação ignora isso completamente.

## Solução

Adicionar um case `'HtmlBlock'` no switch da função `generateHtmlFromNodes` que retorna diretamente o valor de `props.htmlTemplate` ou `props.html`.

### Alteração Necessária

Arquivo: `src/lib/efiCodeHtmlGenerator.ts`

Adicionar no switch (antes do `default:`):

```typescript
case 'HtmlBlock':
  // Retorna o HTML diretamente do template armazenado
  return props.htmlTemplate || props.html || '';
```

### Código Completo do Switch Atualizado

```typescript
switch (componentType) {
  case 'Container':
    // ... existente
    
  case 'Heading':
    // ... existente
    
  case 'Text':
    // ... existente
    
  case 'Button':
    // ... existente
    
  case 'Image':
    // ... existente
    
  case 'Divider':
    // ... existente
    
  case 'Spacer':
    // ... existente
    
  case 'HtmlBlock':
  case 'Bloco HTML':  // Alias para compatibilidade
    // Retorna o HTML diretamente - já contém todo o conteúdo formatado
    return props.htmlTemplate || props.html || '';
    
  default:
    return allChildrenHtml;
}
```

## Fluxo Corrigido

```text
ANTES (problemático):
┌──────────────────────────────────────────────────┐
│ HtmlBlock no editor                              │
│   props.htmlTemplate = "<div>Meu conteúdo</div>" │
│                                                  │
│ Exportação:                                      │
│   switch('HtmlBlock') → default → return ''     │
│   Resultado: HTML vazio!                         │
└──────────────────────────────────────────────────┘

DEPOIS (corrigido):
┌──────────────────────────────────────────────────┐
│ HtmlBlock no editor                              │
│   props.htmlTemplate = "<div>Meu conteúdo</div>" │
│                                                  │
│ Exportação:                                      │
│   switch('HtmlBlock') → return htmlTemplate      │
│   Resultado: "<div>Meu conteúdo</div>"          │
└──────────────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/efiCodeHtmlGenerator.ts` | Adicionar case 'HtmlBlock' no switch |

## Resultado Esperado

Após a correção, o HTML exportado incluirá corretamente todo o conteúdo do `HtmlBlock`, com seus estilos e estrutura preservados.
