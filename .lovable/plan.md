
# Plano: Conversor de HTML para Blocos Craft com IA

## Objetivo

Criar uma funcionalidade que permite ao usuário colar um HTML completo (página inteira) e usar IA para extrair automaticamente blocos individuais reutilizáveis. O foco é extrair apenas HTML estrutural, ignorando CSS e JS.

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuário clica em "Ações" → "Importar código"                │
├─────────────────────────────────────────────────────────────────┤
│ 2. Modal abre com textarea dark theme                          │
│    - Usuário cola HTML completo                                │
│    - Clica em "Analisar com IA"                                │
├─────────────────────────────────────────────────────────────────┤
│ 3. Frontend chama Edge Function analyze-html-blocks            │
│    - Envia HTML para GPT-5 via OpenAI API                      │
│    - IA analisa e extrai blocos independentes                  │
├─────────────────────────────────────────────────────────────────┤
│ 4. Resposta da IA:                                             │
│    - Array de blocos com: name, category, html_content         │
│    - Blocos são limpados (sem CSS inline desnecessário)        │
│    - Estrutura pronta para usar com diferentes containers      │
├─────────────────────────────────────────────────────────────────┤
│ 5. Preview dos blocos detectados                               │
│    - Usuário seleciona quais deseja importar                   │
│    - Clica em "Importar Selecionados"                          │
├─────────────────────────────────────────────────────────────────┤
│ 6. Blocos são criados na tabela efi_code_blocks                │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes a Criar/Modificar

### 1. Reorganizar Botões no AdminEfiCodeBlocks

**Arquivo:** `src/pages/AdminEfiCodeBlocks.tsx`

Substituir os botões separados por um único dropdown "Ações":

```text
┌──────────────────────────────────────────────────────────────┐
│  [Voltar]   Blocos do Efi Code                   [Ações ▼]   │
│                                               ┌──────────────┤
│                                               │ CSS Global   │
│                                               │ Biblioteca   │
│                                               │ Importar AI  │
│                                               └──────────────┘
└──────────────────────────────────────────────────────────────┘
```

### 2. Criar Modal de Importação com IA

**Arquivo:** `src/components/eficode/HtmlToBlocksModal.tsx` (novo)

Interface do modal:

```text
┌─────────────────────────────────────────────────────────────┐
│  ✨ Importar HTML com IA                              [X]  │
├─────────────────────────────────────────────────────────────┤
│  Cole o código HTML completo abaixo. A IA irá analisar     │
│  e extrair blocos individuais reutilizáveis.               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ <!-- Textarea dark theme -->                        │   │
│  │ <html>                                              │   │
│  │   <body>                                            │   │
│  │     <section class="hero">...</section>             │   │
│  │     <section class="features">...</section>         │   │
│  │   </body>                                           │   │
│  │ </html>                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ ] Remover classes CSS inline                            │
│  [ ] Manter apenas estrutura HTML                          │
│                                                             │
│           [Cancelar]  [Analisar com IA ✨]                  │
└─────────────────────────────────────────────────────────────┘
```

Após análise, exibe preview:

```text
┌─────────────────────────────────────────────────────────────┐
│  ✨ Blocos Detectados                                  [X]  │
├─────────────────────────────────────────────────────────────┤
│  A IA identificou 4 blocos no HTML:                        │
│                                                             │
│  [✓] Hero Section (layout)                                 │
│      <section class="hero">...</section>                   │
│                                                             │
│  [✓] Features Grid (layout)                                │
│      <div class="grid grid-cols-3">...</div>               │
│                                                             │
│  [✓] Testimonial Card (layout)                             │
│      <div class="testimonial">...</div>                    │
│                                                             │
│  [ ] Footer (layout)                                       │
│      <footer>...</footer>                                  │
│                                                             │
│           [Voltar]  [Importar 3 Selecionados]              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Edge Function para Análise com IA

**Arquivo:** `supabase/functions/analyze-html-blocks/index.ts` (novo)

A função utiliza a `OPENAI_API_KEY` já configurada para chamar GPT-5:

```typescript
// Pseudocódigo da Edge Function
import OpenAI from "https://esm.sh/openai@4.28.0";

const SYSTEM_PROMPT = `Você é um especialista em análise de HTML.
Sua tarefa é receber um HTML completo e extrair blocos individuais 
que podem ser reutilizados em um editor visual.

REGRAS:
1. Identifique seções semânticas (hero, header, footer, cards, etc)
2. Cada bloco deve ser INDEPENDENTE - funcionando fora do contexto original
3. REMOVA: <style>, <script>, CSS inline complexo
4. MANTENHA: classes CSS simples que referenciam CSS externo
5. PRESERVE: estrutura HTML, textos, imagens, links
6. NÃO inclua <html>, <head>, <body> nos blocos
7. Cada bloco deve ter um nome descritivo

RESPONDA EM JSON:
{
  "blocks": [
    {
      "name": "Hero Section",
      "category": "layout",
      "description": "Banner principal com título e CTA",
      "html_content": "<section class=\"hero\">...</section>"
    }
  ]
}`;

// Chamar OpenAI com o HTML do usuário
const completion = await openai.chat.completions.create({
  model: "gpt-5",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Analise este HTML:\n\n${userHtml}` }
  ],
  temperature: 0.3,  // Baixa para resultados consistentes
  max_tokens: 8000,
});
```

## Fluxo de Dados

```text
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│  Edge Function     │────▶│  OpenAI GPT-5   │
│  (Modal)     │     │analyze-html-blocks │     │    API          │
└──────────────┘     └────────────────────┘     └─────────────────┘
       │                      │                         │
       │  1. HTML colado      │                         │
       │─────────────────────▶│  2. Prompt + HTML       │
       │                      │────────────────────────▶│
       │                      │                         │
       │                      │◀────────────────────────│
       │                      │  3. JSON com blocos     │
       │◀─────────────────────│                         │
       │  4. Blocos extraídos │                         │
       ▼                      ▼                         ▼
   Preview UI            Processamento              Análise IA
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/eficode/HtmlToBlocksModal.tsx` | Modal com textarea e preview de blocos |
| `supabase/functions/analyze-html-blocks/index.ts` | Edge function que chama GPT-5 |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminEfiCodeBlocks.tsx` | Reorganizar botões em dropdown "Ações" |

## Prompt da IA (Detalhado)

O prompt enviado ao GPT-5 será otimizado para:

1. **Identificar blocos semânticos** - hero, header, footer, cards, sections
2. **Limpar HTML** - remover scripts, estilos inline, comentários
3. **Nomear inteligentemente** - baseado no conteúdo e estrutura
4. **Categorizar** - layout, texto, mídia, interativo
5. **Preservar classes** - manter referências a CSS externo (Tailwind, etc)
6. **Detectar placeholders** - converter textos/URLs em [placeholder]

Exemplo de entrada:
```html
<html>
<head><style>.hero { background: blue; }</style></head>
<body>
  <section class="hero bg-blue-500 p-8">
    <h1>Bem-vindo</h1>
    <p>Descrição do produto</p>
    <a href="/comprar" class="btn">Comprar Agora</a>
  </section>
  <div class="features grid grid-cols-3 gap-4">
    <div class="card"><h3>Feature 1</h3><p>Desc</p></div>
    <div class="card"><h3>Feature 2</h3><p>Desc</p></div>
  </div>
</body>
</html>
```

Exemplo de saída esperada:
```json
{
  "blocks": [
    {
      "name": "Hero Section",
      "category": "layout",
      "description": "Banner com título, descrição e botão CTA",
      "html_content": "<section class=\"bg-blue-500 p-8\">\n  <h1>[title]</h1>\n  <p>[description]</p>\n  <a href=\"[cta_link]\" class=\"btn\">[cta_text]</a>\n</section>",
      "default_props": {
        "title": "Bem-vindo",
        "description": "Descrição do produto",
        "cta_link": "/comprar",
        "cta_text": "Comprar Agora"
      }
    },
    {
      "name": "Feature Card",
      "category": "layout",
      "description": "Card individual de feature",
      "html_content": "<div class=\"card\">\n  <h3>[title]</h3>\n  <p>[description]</p>\n</div>",
      "default_props": {
        "title": "Feature",
        "description": "Descrição"
      }
    }
  ]
}
```

## Considerações Técnicas

### Por que GPT-5 (OpenAI)?
- A secret `OPENAI_API_KEY` já está configurada no projeto
- GPT-5 tem excelente capacidade de análise estrutural
- Suporta grandes contextos (HTML completo de páginas)
- Responde bem a instruções precisas de extração

### Tratamento de Erros
- HTML muito grande: truncar ou pedir para dividir
- Timeout: usar streaming ou polling se necessário
- Resposta inválida: fallback para parser local simples

### UX Considerations
- Loading state durante análise IA (pode levar 5-15s)
- Preview claro dos blocos antes de importar
- Opção de editar nome/categoria antes de importar
- Seleção múltipla para importar só o que deseja
