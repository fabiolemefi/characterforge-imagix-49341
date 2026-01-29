
# Plano: Integrar IframePreview no HtmlBlock para Isolamento CSS

## Problema Identificado

Analisando o código, descobri que:

1. O componente `IframePreview` existe e injeta corretamente o CSS global do banco dentro de um iframe isolado
2. Porém, o `HtmlBlock` não utiliza o `IframePreview` - ele renderiza o HTML diretamente via `dangerouslySetInnerHTML`
3. O CSS global (Tailwind v4) está sendo injetado no DOM principal via uma tag `<style>`, onde conflita com o Tailwind v3 da plataforma
4. O reset agressivo que fizemos não é suficiente para isolar completamente os estilos

## Fluxo Atual (Com Problema)

```text
EfiCodeEditor.tsx
  └── <style> { globalCss } </style>  ← CSS v4 no DOM principal (conflita com v3)
  └── <HtmlBlock>
        └── dangerouslySetInnerHTML  ← Renderiza no DOM principal (sem isolamento)
```

## Fluxo Proposto (Solução)

```text
EfiCodeEditor.tsx
  └── <HtmlBlock>
        └── <IframePreview html={template} />
              └── iframe srcdoc com globalCss injetado ← Isolamento total!
```

## Alterações Necessárias

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

| Seção | Alteração |
|-------|-----------|
| Import | Adicionar import do `IframePreview` |
| Renderização | Substituir `dangerouslySetInnerHTML` por `IframePreview` no modo não-edição |
| Modo edição | Manter `contentEditable` para edição inline, mas usar iframe para preview |

### Código Proposto

```typescript
import { IframePreview } from './IframePreview';

export const HtmlBlock = ({ html, htmlTemplate, className = '' }: HtmlBlockProps) => {
  // ... hooks existentes ...
  
  return (
    <div
      ref={(ref) => {
        if (ref && enabled) {
          connect(drag(ref));
        }
      }}
      className={`relative ${className}`}
      style={{ boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none' }}
    >
      {isEditing ? (
        // Modo edição: contentEditable direto (já existe)
        <div
          ref={containerRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: template }}
          onBlur={handleBlur}
          className="outline-2 outline-primary outline-offset-2"
          style={{ cursor: 'text', minHeight: '20px' }}
        />
      ) : (
        // Modo preview: IframePreview com CSS global isolado
        <IframePreview
          html={template}
          onClick={handleContainerClick}
          minHeight={50}
        />
      )}
    </div>
  );
};
```

## Como Funciona

1. **Modo Normal (não editando)**: O bloco HTML é renderizado dentro de um `<iframe>` via `IframePreview`
   - O iframe carrega APENAS o CSS global do banco (Tailwind v4)
   - Não há contaminação do CSS v3 da plataforma
   - O iframe comunica altura e cliques via `postMessage`

2. **Modo Edição (ao clicar)**: Continua usando `contentEditable` para edição inline
   - Quando o usuário clica no bloco selecionado, entra em modo edição
   - O HTML fica editável diretamente
   - Ao perder foco, volta para o iframe preview

## Benefícios

- Isolamento CSS completo via iframe (sandbox real)
- CSS global do admin aplicado corretamente nos blocos
- Funcionalidade de edição inline preservada
- Drag-and-drop do Craft.js continua funcionando (o wrapper div ainda é gerenciado pelo Craft.js)

## Considerações

- O iframe adiciona um pequeno overhead de renderização (já mitigado pelo memoization existente)
- A altura do iframe é ajustada automaticamente via `ResizeObserver` no `IframePreview`
- Cliques no iframe são propagados para o parent para seleção do componente

## Resumo das Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | ~1 | Adicionar import do `IframePreview` |
| `HtmlBlock.tsx` | ~364-388 | Modificar renderização para usar `IframePreview` quando não está editando |
