

## Plano: Corrigir Regex para Suportar Comentários Multi-Linha Decorativos

### Problema Atual

A regex atual não consegue capturar o formato real dos comentários que têm:
- Linha 1: `<!-- =====================...`
- Linha 2: `     BLOCO 1: HERO SECTION...`
- Linha 3: `=====================... -->`

### Solução

Modificar as regex para usar `[\s\S]*?` (qualquer caractere incluindo quebras) entre `<!--` e `BLOCO`:

#### Linha 110 (parseMultipleBlocks):
```typescript
// DE:
const blockRegex = /<!--[\s=]*BLOCO\s+\d+:\s*([^\n]+?)[\s=]*-->([\s\S]*?)(?=<!--[\s=]*BLOCO\s+\d+:|$)/gi;

// PARA:
const blockRegex = /<!--[\s\S]*?BLOCO\s+\d+:\s*([^\n]+?)[\s\S]*?-->([\s\S]*?)(?=<!--[\s\S]*?BLOCO\s+\d+:|$)/gi;
```

#### Linha 215-216 (parseContent):
```typescript
// DE:
const blockPattern = /<!--[\s\S]*?BLOCO\s+\d+:\s*[^\n]+[\s\S]*?-->/gi;
if (blockPattern.test(trimmed)) {

// PARA (criar nova regex para evitar problema do test() consumir índice):
const hasBlockComments = /<!--[\s\S]*?BLOCO\s+\d+:/i.test(trimmed);
if (hasBlockComments) {
```

### Explicação Técnica

| Problema | Solução |
|----------|---------|
| `[\s=]*` só captura espaços e `=` | `[\s\S]*?` captura **qualquer caractere** (incluindo quebras de linha) de forma não-gulosa |
| `test()` com regex global `/g` consome índice | Usar regex sem `/g` para o teste inicial, ou criar nova instância |
| Lookahead muito restritivo | Usar mesmo padrão flexível `[\s\S]*?` no lookahead |

### Regex Corrigida (Visual)

```text
<!--            Início do comentário
[\s\S]*?        QUALQUER caractere (incluindo \n) - não guloso
BLOCO\s+\d+:    Literal "BLOCO", espaços, número, dois-pontos
\s*             Espaços opcionais
([^\n]+?)       GRUPO 1: Nome do bloco (até fim da linha)
[\s\S]*?        Qualquer caractere até o fim do comentário
-->             Fim do comentário
([\s\S]*?)      GRUPO 2: Conteúdo (HTML + JSON)
(?=...)         Lookahead para próximo bloco ou fim
```

### Arquivo a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | 110 | Atualizar `blockRegex` |
| `src/components/eficode/BlockImportModal.tsx` | 215-216 | Simplificar teste de detecção |

### Código Final Esperado

```typescript
// Linha 110
const blockRegex = /<!--[\s\S]*?BLOCO\s+\d+:\s*([^\n]+?)[\s\S]*?-->([\s\S]*?)(?=<!--[\s\S]*?BLOCO\s+\d+:|$)/gi;

// Linhas 215-216
const hasBlockComments = /<!--[\s\S]*?BLOCO\s+\d+:/i.test(trimmed);
if (hasBlockComments) {
```

### Testes que Devem Passar

1. **Formato simples**:
   ```html
   <!-- BLOCO 1: HERO -->
   ```

2. **Formato com decoração inline**:
   ```html
   <!-- ===== BLOCO 1: HERO ===== -->
   ```

3. **Formato multi-linha decorativo** (seu caso):
   ```html
   <!-- =====================================================================
        BLOCO 1: HERO SECTION (full bleed com overlay + call-to-action)
   ===================================================================== -->
   ```

