
# Plano: Isolar Editor Efi Code em iFrame para Evitar Conflitos CSS

## Contexto do Problema

O editor Efi Code atualmente renderiza diretamente no DOM da aplicação React, que usa **Tailwind CSS v3**. Os blocos HTML importados/criados usam **Tailwind CSS v4** (via CSS global configurado no admin). Isso causa conflitos porque:

1. O CSS do Tailwind v3 da plataforma afeta os componentes dentro da área de edição
2. O CSS global v4 dos blocos se mistura com o v3 da plataforma
3. Classes com mesmo nome têm comportamentos diferentes entre versões

## Solução Proposta

Mover toda a área de edição (viewport + blocos) para dentro de um **iframe isolado** que:
- Não herda CSS da plataforma pai
- Carrega apenas o CSS global do banco (Tailwind v4)
- Comunica com o editor pai via `postMessage`

## Arquitetura Atual vs Proposta

```text
ATUAL:
┌─────────────────────────────────────────────────────┐
│ Plataforma React (Tailwind v3)                      │
│  ┌───────────┐ ┌─────────────────────┐ ┌─────────┐  │
│  │ Toolbox   │ │   Viewport/Editor   │ │Settings │  │
│  │ (v3 OK)   │ │   Blocos HTML (v4)  │ │(v3 OK)  │  │
│  │           │ │   ⚠️ CONFLITO CSS   │ │         │  │
│  └───────────┘ └─────────────────────┘ └─────────┘  │
└─────────────────────────────────────────────────────┘

PROPOSTA:
┌─────────────────────────────────────────────────────┐
│ Plataforma React (Tailwind v3)                      │
│  ┌───────────┐ ┌─────────────────────┐ ┌─────────┐  │
│  │ Toolbox   │ │      <iframe>       │ │Settings │  │
│  │ (v3)      │ │  ┌───────────────┐  │ │(v3)     │  │
│  │           │ │  │ Viewport only │  │ │         │  │
│  │           │ │  │ CSS v4 apenas │  │ │         │  │
│  │           │ │  │ Craft.js Frame│  │ │         │  │
│  │           │ │  └───────────────┘  │ │         │  │
│  └───────────┘ └─────────────────────┘ └─────────┘  │
└─────────────────────────────────────────────────────┘
```

## Análise de Viabilidade

### Desafios Técnicos

| Desafio | Complexidade | Solução |
|---------|--------------|---------|
| Craft.js cruza iframe | Alta | Craft.js não suporta nativamente editor em iframe separado. O `Frame` e `Element` precisam estar no mesmo contexto React que o `Editor` provider |
| Drag-and-drop entre janelas | Alta | HTML5 drag-and-drop não funciona cross-iframe. Precisaria de postMessage customizado |
| Sincronização de estado | Média | Toda mudança no iframe precisaria ser comunicada via postMessage |
| Seleção de componentes | Alta | O SettingsPanel precisa do contexto useNode do Craft.js que não atravessa iframe |

### Limitação Fundamental

O **Craft.js não foi projetado para separação iframe**. Os hooks `useEditor`, `useNode`, `connectors.connect`, `connectors.create` dependem de um único React Context que não pode ser compartilhado entre documentos diferentes.

## Alternativas Viáveis

### Opção 1: Shadow DOM (Recomendada)

Usar Shadow DOM para encapsular apenas a área de preview dos blocos HTML, mantendo Craft.js no DOM principal.

**Prós:**
- Isolamento CSS completo
- Craft.js continua funcionando normalmente
- Não precisa de postMessage
- Menor refatoração

**Contras:**
- Shadow DOM pode ter quirks com alguns eventos
- React precisa de adaptação para renderizar no shadow

### Opção 2: CSS Scoping com Prefixo

Adicionar prefixo único a todas as classes do Tailwind v4 no CSS global.

**Prós:**
- Zero mudança arquitetural
- Simples de implementar

**Contras:**
- Requer modificar o CSS global sempre
- Não é 100% infalível

### Opção 3: Iframe apenas para Preview (Já existe parcialmente)

O `IframePreview` já existe para preview de blocos HTML individuais. Expandir para toda a área de edição visual.

**Prós:**
- Já temos a base
- Isolamento real

**Contras:**
- Perderia interatividade do Craft.js (drag, select, resize)
- Seria apenas visualização, não edição

## Recomendação

A abordagem mais pragmática é a **Opção 2 (CSS Scoping)** combinada com melhorias no reset CSS atual:

1. Manter o reset `.efi-editor-viewport` já existente no `index.css`
2. Adicionar um wrapper com reset mais agressivo para neutralizar Tailwind v3
3. Garantir que o CSS global v4 seja injetado dentro desse escopo com maior especificidade

## Implementação Proposta

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Expandir regras de reset para `.efi-editor-viewport` com `all: initial` seletivo |
| `src/pages/EfiCodeEditor.tsx` | Garantir que o CSS global seja injetado com alta especificidade |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Verificar que estilos inline prevalecem |

### CSS Reset Aprimorado

```css
/* Reset agressivo para isolar área do editor */
.efi-editor-viewport {
  /* Reset base typography para remover influência do Tailwind v3 */
  font-family: inherit;
  line-height: normal;
  
  /* Isolar do Tailwind preflight */
  all: revert;
}

.efi-editor-viewport *,
.efi-editor-viewport *::before,
.efi-editor-viewport *::after {
  /* Permitir que o CSS global v4 prevaleça */
  box-sizing: border-box;
}

/* Injetar CSS global com wrapper de alta especificidade */
.efi-editor-viewport .efi-content {
  /* Aqui o CSS v4 prevalece */
}
```

### Injeção de CSS com Especificidade

No `EfiCodeEditor.tsx`, o CSS global seria injetado assim:

```tsx
<style dangerouslySetInnerHTML={{ 
  __html: `.efi-editor-viewport .efi-content { ${globalCss} }` 
}} />
```

## Conclusão

**Não é possível** colocar o editor Craft.js inteiro em um iframe separado devido a limitações fundamentais da biblioteca. Porém, podemos alcançar isolamento CSS efetivo através de:

1. Reset CSS agressivo na área do viewport
2. Wrapper com escopo específico para o CSS v4
3. Alta especificidade nas regras do CSS global

Essa abordagem mantém toda a funcionalidade do editor (drag-and-drop, seleção, propriedades) enquanto isola visualmente os estilos dos blocos.

## Próximos Passos

Se aprovar, implementarei:
1. CSS reset aprimorado em `index.css`
2. Wrapper de escopo no viewport do editor
3. Ajuste na injeção do CSS global para alta especificidade
