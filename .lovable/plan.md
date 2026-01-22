

## Plano: Corrigir Regex do Parser de Importação

### Problema Identificado

A regex atual não captura comentários HTML multi-linha. O formato esperado pelo código é:

```html
<!-- ===== BLOCO 1: HERO SECTION ===== -->
```

Mas o formato enviado pelo usuario tem quebras de linha:

```html
<!-- =====================================================================
     BLOCO 1: HERO SECTION (full bleed com overlay + call-to-action)
===================================================================== -->
```

---

### Solucao

Atualizar as regex em duas linhas do `BlockImportModal.tsx`:

#### Linha 110 (parseMultipleBlocks):
```typescript
// DE:
const blockRegex = /<!--\s*=*\s*BLOCO\s+\d+:\s*(.+?)\s*=*\s*-->([\s\S]*?)(?=<!--\s*=*\s*BLOCO\s+\d+:|$)/gi;

// PARA (suporta multi-linha):
const blockRegex = /<!--[\s=]*BLOCO\s+\d+:\s*([^\n]+?)[\s=]*-->([\s\S]*?)(?=<!--[\s=]*BLOCO\s+\d+:|$)/gi;
```

#### Linha 215 (parseContent):
```typescript
// DE:
const blockPattern = /<!--\s*=*\s*BLOCO\s+\d+:\s*.+?\s*=*\s*-->/gi;

// PARA (suporta multi-linha):
const blockPattern = /<!--[\s\S]*?BLOCO\s+\d+:\s*[^\n]+[\s\S]*?-->/gi;
```

---

### Detalhes Tecnicos

| Alteracao | Justificativa |
|-----------|---------------|
| `[\s=]*` | Captura qualquer combinacao de espacos e sinais de igual (incluindo novas linhas) |
| `([^\n]+?)` | Captura o nome do bloco (ate o fim da linha, sem incluir a quebra) |
| `[\s\S]*?` | Captura qualquer caractere incluindo quebras de linha (nao-guloso) |

---

### Arquivo a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/eficode/BlockImportModal.tsx` | Linhas 110 e 215 - atualizar regex |

---

### Regex Corrigida (Explicacao Visual)

```text
<!--              Inicio do comentario HTML
[\s=]*            Espacos, quebras de linha e sinais de igual opcionais
BLOCO\s+\d+:      Palavra "BLOCO", espacos, numero, dois-pontos
\s*               Espacos opcionais
([^\n]+?)         GRUPO 1: Nome do bloco (qualquer texto ate fim da linha)
[\s=]*            Espacos, quebras de linha e sinais de igual opcionais  
-->               Fim do comentario HTML
([\s\S]*?)        GRUPO 2: Conteudo do bloco (HTML + JSON)
(?=...)           Lookahead para proximo bloco ou fim do texto
```

---

### Testes que Devem Passar

1. Comentario em linha unica:
   ```html
   <!-- BLOCO 1: HERO SECTION -->
   ```

2. Comentario com decoracao simples:
   ```html
   <!-- ===== BLOCO 1: HERO SECTION ===== -->
   ```

3. Comentario multi-linha com decoracao:
   ```html
   <!-- =====================================================================
        BLOCO 1: HERO SECTION (full bleed com overlay + call-to-action)
   ===================================================================== -->
   ```

---

### Resultado Esperado

Apos a correcao, o parser devera:
- Detectar corretamente blocos com comentarios multi-linha
- Extrair o nome "HERO SECTION (full bleed com overlay + call-to-action)"
- Continuar suportando formatos anteriores (linha unica)

