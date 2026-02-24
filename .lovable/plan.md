

# Implementar Blocos "Paleta de Cores" no Brand Guide

## Situacao Atual

Nada foi implementado ainda. O enum do banco de dados nao tem os novos tipos e o componente nao existe. Precisamos:

1. Criar o enum no banco
2. Criar o componente visual
3. Registrar nos hooks e paginas

## Etapas

### 1. Migracão no banco de dados

Adicionar os valores `color_palette_2` e `color_palette_3` ao enum `brand_guide_block_type` e recarregar o cache do schema.

```sql
ALTER TYPE public.brand_guide_block_type ADD VALUE IF NOT EXISTS 'color_palette_2';
ALTER TYPE public.brand_guide_block_type ADD VALUE IF NOT EXISTS 'color_palette_3';
NOTIFY pgrst, 'reload schema';
```

### 2. Criar componente `src/components/brandguide/ColorPaletteBlock.tsx`

Componente reutilizavel que recebe o numero de colunas (2 ou 3). Para cada cor exibe:

```text
+---------------------------+
|                           |
|    [quadrado com a cor]   |
|                           |
+---------------------------+
  Nome da Cor
  ---------------------------
  Hex    #FF5733
  RGB    255, 87, 51
  CMYK   0, 66, 80, 0
```

- Hex editavel no admin, ao digitar converte automaticamente para RGB e atualiza a cor do quadrado
- CMYK editavel manualmente
- No modo publico: apenas exibicao
- Grid `grid-cols-2` ou `grid-cols-3` conforme o tipo do bloco
- Borda visivel para cores claras

### 3. Atualizar `src/hooks/useBrandGuide.ts`

- Adicionar `'color_palette_2' | 'color_palette_3'` ao union type de `block_type`
- Adicionar default content no `addBlock`:
  - `color_palette_2`: 2 cores vazias
  - `color_palette_3`: 3 cores vazias

### 4. Atualizar `src/hooks/useBrandGuidePageContent.ts`

- Adicionar os novos tipos ao union type de `block_type`

### 5. Atualizar `src/pages/AdminBrandGuidePage.tsx`

- Importar `ColorPaletteBlock`
- Adicionar cases `color_palette_2` e `color_palette_3` no `renderBlock`
- Adicionar opcoes "Paleta de Cores (2 colunas)" e "Paleta de Cores (3 colunas)" no dropdown
- Atualizar tipo do `handleAddBlock`

### 6. Atualizar `src/pages/BrandGuide.tsx`

- Importar `ColorPaletteBlock`
- Adicionar cases no `renderBlock` publico

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar (enum) |
| `src/components/brandguide/ColorPaletteBlock.tsx` | Criar |
| `src/hooks/useBrandGuide.ts` | Modificar tipos e addBlock |
| `src/hooks/useBrandGuidePageContent.ts` | Modificar tipos |
| `src/pages/AdminBrandGuidePage.tsx` | Modificar renderBlock e dropdown |
| `src/pages/BrandGuide.tsx` | Modificar renderBlock |

