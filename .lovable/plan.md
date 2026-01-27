

# Plano: Isolar CSS Global da Área do Editor Efi Code

## Problema Identificado

Os estilos globais do Tailwind CSS (definidos em `src/index.css`) estão afetando os blocos HTML no editor:

```css
/* Tailwind base - causando problemas */
* {
  border-color: hsl(var(--border));
}
*, :before, :after {
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: #e5e7eb;
}
```

Esses estilos sobrescrevem as bordas e outros estilos definidos nos blocos HTML importados.

## Solução Proposta

Adicionar um CSS de "reset reverso" que neutraliza os estilos do Tailwind apenas dentro da área do editor. Isso será feito através de uma classe `.efi-editor-viewport` que restaura os valores padrão do navegador para os elementos filhos.

### Abordagem Técnica

1. Adicionar classe identificadora na área do editor
2. Criar regras CSS que "desfazem" o reset do Tailwind para essa área
3. Aplicar `all: revert` para restaurar estilos padrão do navegador

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Adicionar classe `.efi-editor-viewport` ao container do editor |
| `src/index.css` | Adicionar regras de reset para `.efi-editor-viewport` |

## Implementação

### 1. EfiCodeEditor.tsx - Adicionar classe ao container

No container principal da área de visualização (onde os blocos são renderizados), adicionar a classe `efi-editor-viewport`:

```tsx
// Antes (linha ~295)
<div 
  className="mx-auto overflow-hidden transition-all duration-300" 
  style={{...}}
>
  <EditorFrame editorState={editorState} />
</div>

// Depois
<div 
  className="mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport" 
  style={{...}}
>
  <EditorFrame editorState={editorState} />
</div>
```

### 2. index.css - Adicionar regras de neutralização

Adicionar no final do arquivo CSS regras que neutralizam os estilos do Tailwind para a área do editor:

```css
/* Reset para área do editor Efi Code */
/* Neutraliza os estilos globais do Tailwind dentro do viewport do editor */
.efi-editor-viewport *,
.efi-editor-viewport *::before,
.efi-editor-viewport *::after {
  /* Restaurar comportamento padrão de bordas */
  border-color: currentColor;
  border-style: none;
  /* NÃO resetar box-sizing pois queremos manter border-box */
}

/* Permitir que elementos definam suas próprias bordas */
.efi-editor-viewport [style*="border"],
.efi-editor-viewport [class*="border"] {
  border-style: solid;
}

/* Reset mais específico para garantir que estilos inline prevaleçam */
.efi-editor-viewport *:not([class*="ring"]):not([class*="outline"]) {
  border-color: inherit;
}
```

## Alternativa Mais Agressiva (se necessário)

Se o reset acima não for suficiente, usar `all: revert` para restaurar completamente os estilos do navegador:

```css
/* Alternativa: reset completo para o viewport do editor */
.efi-editor-viewport * {
  all: revert;
  box-sizing: border-box; /* Manter apenas box-sizing */
}
```

Porém essa abordagem pode afetar outros estilos do Craft.js, então a primeira opção é preferível.

## Fluxo de Renderização

```text
┌─────────────────────────────────────────────────────────────────┐
│ ANTES:                                                          │
├─────────────────────────────────────────────────────────────────┤
│ index.css aplica:                                               │
│   * { border-color: hsl(var(--border)); }                      │
│                                                                 │
│ ↓ afeta todos os elementos                                     │
│                                                                 │
│ Bloco HTML com border: 1px solid #f37021                       │
│ → border-color sobrescrito para cinza do tema                  │
│ → Visual quebrado                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DEPOIS:                                                         │
├─────────────────────────────────────────────────────────────────┤
│ index.css aplica:                                               │
│   * { border-color: hsl(var(--border)); }                      │
│                                                                 │
│   .efi-editor-viewport * {                                     │
│     border-color: currentColor;                                │
│     border-style: none;                                        │
│   }                                                            │
│                                                                 │
│ ↓ Regra mais específica prevalece no viewport                  │
│                                                                 │
│ Bloco HTML com border: 1px solid #f37021                       │
│ → Estilo inline preservado                                     │
│ → Visual correto                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

- Estilos globais do Tailwind não afetam blocos dentro do editor
- Blocos HTML mantêm suas bordas e estilos originais
- Ring de seleção do Craft.js continua funcionando (classes específicas excluídas)
- Exportação HTML não é afetada (já é isolada)
- Preview em nova aba não é afetado (também isolado)

