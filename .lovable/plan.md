
# Plano: Isolar CSS Global no Viewport do Efi Code Editor

## Problema Identificado

O CSS Global está sendo injetado no `document.head`, mas:

1. O projeto já possui Tailwind CSS carregado via `src/index.css`
2. O CSS injetado dinamicamente é carregado **antes** do CSS do Vite, fazendo com que o CSS do projeto tenha precedência
3. As variáveis CSS do projeto (como `--background`, `--foreground`) sobrescrevem as do CSS injetado

Resultado: os estilos do CSS Global não aparecem corretamente no editor.

## Solução

Aplicar o CSS Global usando uma tag `<style>` **dentro do próprio viewport do editor**, não no `document.head`. Isso garante:

- Escopo isolado para o viewport
- Sem conflitos com o CSS do projeto principal
- Os estilos são aplicados apenas onde importa: na área de edição

## Implementação

### Arquivo: `src/pages/EfiCodeEditor.tsx`

**1. Remover a injeção no `document.head`** (linhas 79-98)

**2. Adicionar a tag `<style>` diretamente no container do viewport:**

```typescript
{/* Center - Viewport */}
<main 
  className="flex-1 overflow-auto p-8"
  style={{ backgroundColor: pageSettings.backgroundColor }}
>
  {/* Inject Global CSS scoped to viewport */}
  <style dangerouslySetInnerHTML={{ __html: globalCss }} />
  
  {viewMode === 'visual' ? (
    <div
      className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
      ...
    >
      <EditorFrame editorState={editorState} />
    </div>
  ) : (
    // Code view...
  )}
</main>
```

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────┐
│ EfiCodeEditor                                           │
│  ┌───────────┬────────────────────────┬──────────────┐ │
│  │ Toolbox   │   Viewport (main)      │ Settings     │ │
│  │           │   ┌──────────────────┐ │              │ │
│  │           │   │ <style>globalCss │ │              │ │
│  │           │   │ ┌──────────────┐ │ │              │ │
│  │           │   │ │ Editor Frame │ │ │              │ │
│  │           │   │ │ (blocos)     │ │ │              │ │
│  │           │   │ └──────────────┘ │ │              │ │
│  │           │   └──────────────────┘ │              │ │
│  └───────────┴────────────────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────┘

CSS Global aplicado APENAS dentro do <main> do viewport
```

## Benefícios

| Antes | Depois |
|-------|--------|
| CSS injetado no `<head>` global | CSS injetado dentro do viewport |
| Conflitos com Tailwind do projeto | Sem conflitos (escopo isolado) |
| Ordem de carregamento problemática | CSS sempre presente no momento correto |
| Estilos vazam para outras partes | Estilos confinados ao editor |

## Arquivos a Modificar

- `src/pages/EfiCodeEditor.tsx`:
  - Remover o `useEffect` que injeta CSS no `document.head` (linhas 79-98)
  - Adicionar `<style dangerouslySetInnerHTML={{ __html: globalCss }} />` dentro do `<main>` do viewport (linha 234)

## Nota Técnica

Esta abordagem usa CSS em cascata naturalmente - os estilos definidos no CSS Global terão efeito sobre todos os elementos dentro do `<main>`, incluindo os blocos HTML renderizados pelo Craft.js. Como o `<style>` está dentro do DOM do viewport, os estilos são aplicados corretamente sem interferir no resto da aplicação.
