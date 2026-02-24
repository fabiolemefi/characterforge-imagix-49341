

# Plano: Blocos "Paleta de Cores 2" e "Paleta de Cores 3"

## Objetivo

Criar dois novos tipos de bloco para o Brand Guide, inspirados no layout do Duolingo Design System:
- **color_palette_2**: 2 colunas de cores (estilo "Core Brand Colors")
- **color_palette_3**: 3 colunas de cores (estilo "Secondary Colors")

Cada coluna exibe:
- Quadrado grande com a cor
- Nome da cor
- Hex (editavel, ao digitar atualiza o quadrado e o RGB automaticamente)
- RGB (calculado automaticamente)
- CMYK (editavel manualmente)

## Arquivos a Criar

### 1. `src/components/brandguide/ColorPaletteBlock.tsx`

Componente reutilizavel que recebe o numero de colunas (2 ou 3). Cada coluna tera:

```text
+---------------------------+
|                           |
|    [cor preenchida]       |
|    (quadrado grande)      |
|                           |
+---------------------------+
  Nome da Cor
  ---------------------------
  Hex    #FF5733
  RGB    255, 87, 51
  CMYK   0, 66, 80, 0
```

Logica de conversao:
- Ao editar o campo Hex, converte automaticamente para RGB e atualiza a cor do quadrado
- CMYK e preenchido manualmente (nao ha conversao exata de Hex para CMYK)
- No modo admin: campos editaveis (inputs)
- No modo publico: apenas exibicao dos valores

Estrutura do `content`:
```typescript
{
  colors: [
    { name: "Feather Green", hex: "58CC02", rgb: "88, 204, 2", cmyk: "57, 0, 99, 20" },
    { name: "Mask Green", hex: "89E219", rgb: "137, 226, 25", cmyk: "39, 0, 89, 11" }
  ]
}
```

## Arquivos a Modificar

### 2. `src/hooks/useBrandGuide.ts`

- Adicionar `'color_palette_2' | 'color_palette_3'` ao union type de `block_type`
- Adicionar `defaultContent` no `addBlock` para ambos os tipos:
  - `color_palette_2`: array de 2 cores vazias
  - `color_palette_3`: array de 3 cores vazias

### 3. `src/pages/AdminBrandGuidePage.tsx`

- Importar `ColorPaletteBlock`
- Adicionar 2 novos `case` no `renderBlock` (`color_palette_2`, `color_palette_3`)
- Adicionar 2 novas opcoes no dropdown "Adicionar Bloco":
  - "Paleta de Cores (2 colunas)"
  - "Paleta de Cores (3 colunas)"
- Atualizar o tipo do `handleAddBlock` para aceitar os novos tipos

### 4. `src/pages/BrandGuide.tsx`

- Importar `ColorPaletteBlock`
- Adicionar 2 novos `case` no `renderBlock` publico

### 5. `src/hooks/useBrandGuidePageContent.ts`

- Atualizar o tipo `BrandGuideBlock` se existir uma copia do union type nesse arquivo

## Detalhes Tecnicos

### Conversao Hex para RGB
```typescript
function hexToRgb(hex: string): string {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
```

### Layout visual
- Quadrado de cor: `aspect-square rounded-lg border` com `backgroundColor` dinamico
- Cores claras (ex: branco) terao borda visivel para nao "sumir"
- Grid: `grid-cols-2` ou `grid-cols-3` conforme o tipo
- Separador fino entre nome e dados tecnicos (como no Duolingo)
- Fontes monoespaçadas para os valores hex/rgb/cmyk

