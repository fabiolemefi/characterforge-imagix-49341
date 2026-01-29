
# Plano: Substituir Imagens por Placeholder nos Blocos

## Contexto

O usuário quer:
1. **Atualizar blocos existentes**: Substituir todas as URLs de imagens no banco de dados pela URL do placeholder
2. **Importação com IA**: Ao importar blocos via "Importar com IA", substituir automaticamente todas as URLs de imagens pelo placeholder

**URL do Placeholder**: `https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png`

## Parte 1: Atualizar Blocos Existentes no Banco

Consulta no banco identificou blocos com imagens (exemplos):
- `Hero com Imagem` - contém `src="https://image.comunicacao.sejaefi.com.br/..."`
- `Header com Navegação` - contém `xlink:href="./media/..."` e `src="./media/..."`
- Outros blocos com `srcset`, `src`, `xlink:href`

### Ação: Executar Migration SQL

```sql
UPDATE efi_code_blocks
SET html_content = regexp_replace(
  regexp_replace(
    regexp_replace(
      html_content,
      'src="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"',
      'src="https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png"',
      'gi'
    ),
    'srcset="[^"]*"',
    'srcset="https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png"',
    'gi'
  ),
  'xlink:href="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"',
  'xlink:href="https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png"',
  'gi'
)
WHERE html_content IS NOT NULL
  AND (
    html_content LIKE '%src=%' 
    OR html_content LIKE '%srcset=%'
    OR html_content LIKE '%xlink:href=%'
  );
```

## Parte 2: Substituição Automática na Importação com IA

### Arquivo: `supabase/functions/analyze-html-blocks/index.ts`

A edge function `analyze-html-blocks` é quem processa o HTML e retorna os blocos. Vou adicionar pós-processamento para substituir todas as URLs de imagem pelo placeholder.

| Linha | Alteração |
|-------|-----------|
| ~129-136 | Adicionar função de substituição de imagens após normalização dos blocos |

### Código Adicionado

```typescript
const PLACEHOLDER_IMAGE = 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png';

// Função para substituir URLs de imagem pelo placeholder
const replaceImageUrls = (html: string): string => {
  return html
    // Substitui src="..." que aponta para imagens
    .replace(/src="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"/gi, `src="${PLACEHOLDER_IMAGE}"`)
    // Substitui srcset="..."
    .replace(/srcset="[^"]*"/gi, `srcset="${PLACEHOLDER_IMAGE}"`)
    // Substitui xlink:href="..." para SVGs
    .replace(/xlink:href="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"/gi, `xlink:href="${PLACEHOLDER_IMAGE}"`)
    // Substitui URLs em background-image inline
    .replace(/url\(['"]?[^'")\s]*\.(jpg|jpeg|png|gif|webp|svg)[^'")\s]*['"]?\)/gi, `url("${PLACEHOLDER_IMAGE}")`);
};
```

### Aplicação no Fluxo

No momento da normalização dos blocos (linhas ~129-136), aplicar a função:

```typescript
const normalizedBlocks = blocks.map((block: any, index: number) => ({
  name: block.name || `Bloco ${index + 1}`,
  category: ['layout', 'texto', 'midia', 'interativo'].includes(block.category) 
    ? block.category 
    : 'layout',
  description: block.description || '',
  html_content: replaceImageUrls(block.html_content || block.html || ''), // <-- AQUI
})).filter((block: any) => block.html_content && block.html_content.trim().length > 0);
```

## Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| Database | Migration SQL para atualizar blocos existentes |
| `analyze-html-blocks/index.ts` | Adicionar função `replaceImageUrls` e aplicar nos blocos |

## Fluxo Final

```text
1. BLOCOS EXISTENTES
   ├── Migration SQL substitui todas as URLs de imagem → placeholder
   └── Imagens existentes apontam para placeholder

2. NOVOS BLOCOS (Importar com IA)
   ├── Usuário cola HTML
   ├── Edge function analisa e extrai blocos
   ├── Função replaceImageUrls() substitui todas as URLs → placeholder
   └── Blocos salvos já com placeholder
```

## Benefícios

- Blocos nunca ficam com imagens quebradas
- Administrador pode substituir pelo ativo correto na edição individual
- Consistência visual na biblioteca de blocos
