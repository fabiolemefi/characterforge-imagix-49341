

## Plano: Exportar conteúdo do Guia de Marca

O volume de dados é grande (66 blocos em 7+ páginas), então a melhor abordagem é criar uma **função backend** que extrai todo o conteúdo e retorna um JSON estruturado limpo, pronto para copiar e passar para outra IA.

### Estrutura atual no banco

```text
4 Categorias (menus):
├── ID Verbal (6 páginas)
│   ├── Nosso tom de voz (4 blocos)
│   ├── Canais (2 blocos)
│   ├── Lista de palavras
│   ├── O básico da Efi
│   ├── Nosso nome
│   └── Narrativa
├── ID Visual (11 páginas)
│   ├── Logo (15 blocos)
│   ├── Efi Bank
│   ├── Endosso
│   ├── Diretrizes do logo e do símbolo
│   ├── Paleta de cores (10 blocos)
│   ├── Tipografia
│   ├── Estilo de fotografia
│   ├── Elementos gráficos
│   ├── Estilo iconográfico
│   ├── Estilo ilustrativo
│   └── Ritmo nas composições
├── Layouts (4 páginas)
│   ├── Módulos
│   ├── Margens e colunas
│   ├── Aplicação dos elementos
│   └── Composição final
└── Motion Guide (3 páginas)
    ├── Home (1 bloco)
    ├── Orientações de audiovisual (24 blocos)
    └── Trilha sonora (3 blocos)

+ 7 blocos na Home do Brand Guide
```

### O que será criado

1. **Edge function `export-brand-guide`**: consulta todas as categorias, páginas e blocos, faz strip do HTML para texto puro, e retorna um JSON organizado com:
   - Estrutura de menus (categorias > páginas)
   - Conteúdo textual limpo de cada bloco (sem tags HTML, sem atributos)
   - URLs de imagens/vídeos preservadas
   - Dados de paleta de cores (hex, rgb, cmyk, pantone)

2. **Botão "Exportar conteúdo"** na página `/brand-guide` que chama a função e faz download de um arquivo `.json`

### Detalhes técnicos

- A função usa o service role key para acessar todos os dados
- Strip de HTML feito com regex server-side (remove tags, atributos, comentários)
- Formato de saída organizado por categoria > página > blocos
- Cada bloco terá: `type`, `position`, `text_content`, `media_urls`, `color_data`

