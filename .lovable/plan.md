

## Plano: Redesign do ColorPaletteBlock (card style) com campo "Pantone"

Redesign do componente `ColorPaletteBlock.tsx` para layout de card conforme referência, usando "Pantone" no lugar de "PMS".

### Mudanças em `src/components/brandguide/ColorPaletteBlock.tsx`

1. **Interface `ColorItem`**: adicionar campo `pantone: string`
2. **Card wrapper**: cada cor dentro de `div` com `border rounded-xl overflow-hidden`
3. **Color swatch**: ocupa topo do card, aspect-ratio mantido
4. **Header**: nome da cor em **bold** + índice numérico à direita
5. **`<Separator />`** entre header e códigos
6. **Grid 2x2 para códigos**:
   - Esquerda: Hex (com ícone `Copy`) + RGB
   - Direita: CMYK + Pantone
7. **Copiar Hex**: `navigator.clipboard.writeText()` + toast via `sonner`
8. **RGB sem vírgulas**: `137 226 25`
9. **Admin mode**: inputs editáveis dentro da mesma estrutura de card, incluindo campo Pantone
10. **Inicialização**: `addColor` cria `{ name: '', hex: '#', rgb: '', cmyk: '', pantone: '' }`

### Nenhuma alteração no banco necessária
O campo `pantone` é armazenado no JSONB `content` existente.

