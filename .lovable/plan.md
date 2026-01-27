
# Plano: Adicionar Padding de Página e Paleta de Cores Efí

## Objetivo

Adicionar controles de padding (superior, inferior, laterais) no accordion "Layout" e criar um dropdown de "Paleta de cores Efí" para facilitar a seleção de cores, além de permitir que o fundo seja transparente para exibir imagens de fundo.

## Mudanças Necessárias

### 1. Atualizar Interface PageSettings

**Arquivo:** `src/hooks/useEfiCodeSites.ts`

Adicionar novos campos para padding:

```typescript
export interface PageSettings {
  // ... campos existentes ...
  paddingTop: string;      // Default: '0'
  paddingBottom: string;   // Default: '0'
  paddingLeft: string;     // Default: '0'
  paddingRight: string;    // Default: '0'
}

export const defaultPageSettings: PageSettings = {
  // ... valores existentes ...
  paddingTop: '0',
  paddingBottom: '0',
  paddingLeft: '0',
  paddingRight: '0',
};
```

### 2. Modificar o Toolbox - Accordion Layout

**Arquivo:** `src/components/eficode/editor/Toolbox.tsx`

#### 2.1 Campos de Padding

Adicionar 4 inputs para padding (em px):

```text
┌────────────────────────────────────────────┐
│ Layout                                     │
├────────────────────────────────────────────┤
│ Padding da Página                          │
│ ┌─────────┐ ┌─────────┐                   │
│ │ Superior│ │ Inferior│                   │
│ │   0  px │ │   0  px │                   │
│ └─────────┘ └─────────┘                   │
│ ┌─────────┐ ┌─────────┐                   │
│ │ Esquerda│ │ Direita │                   │
│ │   0  px │ │   0  px │                   │
│ └─────────┘ └─────────┘                   │
├────────────────────────────────────────────┤
│ Cor de fundo                               │
│ ┌──────┐ ┌───────────────────────────────┐│
│ │ 🎨   │ │ #ffffff             [Paleta ▼]││
│ └──────┘ └───────────────────────────────┘│
│                                            │
│ [ ] Sem cor de fundo (transparente)        │
└────────────────────────────────────────────┘
```

#### 2.2 Paleta de Cores Efí

Criar um dropdown/popover com as cores da marca:

| Cor | Hex | Nome |
|-----|-----|------|
| 🟠 | #f37021 | Laranja Efí |
| 🔵 | #00809d | Verde-água Efí |
| ⬜ | #f6f8fc | Cinza Claro |
| 🔲 | #e8f0f8 | Azul Gelo |
| ⬛ | #a4acbc | Cinza Médio |
| ⚫ | #1d1d1d | Preto |

#### 2.3 Opção Transparente

Adicionar checkbox para remover cor de fundo:

```typescript
// Quando marcado, backgroundColor = 'transparent'
<Checkbox
  checked={settings.backgroundColor === 'transparent'}
  onCheckedChange={(checked) => 
    handleSettingChange('backgroundColor', checked ? 'transparent' : '#ffffff')
  }
/>
<Label>Sem cor de fundo (transparente)</Label>
```

### 3. Atualizar Gerador HTML

**Arquivo:** `src/lib/efiCodeHtmlGenerator.ts`

Modificar para aplicar padding no container:

```typescript
// Estilos do container wrapper com padding
const containerStyles = [
  `max-width: ${pageSettings.containerMaxWidth || '1200'}px`,
  'margin: 0 auto',
  `padding-top: ${pageSettings.paddingTop || '0'}px`,
  `padding-bottom: ${pageSettings.paddingBottom || '0'}px`,
  `padding-left: ${pageSettings.paddingLeft || '0'}px`,
  `padding-right: ${pageSettings.paddingRight || '0'}px`,
].join('; ');

// Para cor de fundo, tratar 'transparent' corretamente
const bodyStyles = [];
if (pageSettings.backgroundColor && pageSettings.backgroundColor !== 'transparent') {
  bodyStyles.push(`background-color: ${pageSettings.backgroundColor}`);
}
```

### 4. Atualizar Preview do Editor

**Arquivo:** `src/pages/EfiCodeEditor.tsx`

Aplicar padding e transparência na área de preview:

```typescript
<main 
  className="flex-1 overflow-auto" 
  style={{
    backgroundColor: pageSettings.backgroundColor === 'transparent' 
      ? 'transparent' 
      : pageSettings.backgroundColor,
    backgroundImage: pageSettings.backgroundImage 
      ? `url(${pageSettings.backgroundImage})` 
      : undefined,
    backgroundSize: pageSettings.backgroundSize,
    backgroundPosition: pageSettings.backgroundPosition,
  }}
>
  <div 
    className="mx-auto"
    style={{
      paddingTop: `${pageSettings.paddingTop || 0}px`,
      paddingBottom: `${pageSettings.paddingBottom || 0}px`,
      paddingLeft: `${pageSettings.paddingLeft || 0}px`,
      paddingRight: `${pageSettings.paddingRight || 0}px`,
    }}
  >
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useEfiCodeSites.ts` | Adicionar campos de padding ao PageSettings |
| `src/components/eficode/editor/Toolbox.tsx` | Adicionar inputs de padding, dropdown de paleta e checkbox transparente |
| `src/lib/efiCodeHtmlGenerator.ts` | Aplicar padding no HTML exportado e tratar cor transparente |
| `src/pages/EfiCodeEditor.tsx` | Aplicar padding e transparência no preview |

## Paleta de Cores Efí

```typescript
const EFI_COLOR_PALETTE = [
  { hex: '#f37021', name: 'Laranja Efí' },
  { hex: '#00809d', name: 'Verde-água Efí' },
  { hex: '#f6f8fc', name: 'Cinza Claro' },
  { hex: '#e8f0f8', name: 'Azul Gelo' },
  { hex: '#a4acbc', name: 'Cinza Médio' },
  { hex: '#1d1d1d', name: 'Preto' },
];
```

## Resultado Esperado

- Campos de padding (superior, inferior, esquerda, direita) com valor padrão 0
- Dropdown "Paleta de cores Efí" com as 6 cores da marca
- Ao clicar em uma cor, substitui a cor de fundo atual
- Checkbox para remover cor de fundo (deixar transparente)
- Imagem de fundo visível quando cor é transparente
- Padding aplicado corretamente no preview e na exportação HTML
