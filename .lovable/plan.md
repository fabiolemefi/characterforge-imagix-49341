
# Plano: Criar Nova Área "Fubá Explorer" na Rota /trilha

## Visão Geral

Transformar o arquivo HTML "Fubá Explorer" em uma nova página React acessível pela rota `/trilha`. Esta página apresenta uma visualização interativa de trilha de carreiras com um canvas infinito, um personagem animado (Fubá - um cachorro), e efeitos visuais como pegadas, confetes e latidos.

## Características do Fubá Explorer

- Canvas infinito com drag & zoom
- Mascote animado (cachorro Fubá) que percorre os caminhos
- Efeitos visuais: pegadas, partículas de poeira, confetes
- Painel lateral com detalhes do cargo
- Parallax no background
- Navegação entre nós da carreira com animações GSAP

## Arquivos a Criar

### 1. `src/pages/FubaExplorer.tsx`

Componente React principal que contém:
- Estilos CSS inline (convertidos do HTML original)
- Referências aos elementos DOM via useRef
- Integração com GSAP via useEffect
- Estados para controle do painel, nó selecionado, navegação

```text
Estrutura do componente:
┌─────────────────────────────────────────────┐
│ FubaExplorer                                │
│  ├── Parallax Background                    │
│  ├── UI Header (select + botão)             │
│  ├── Side Panel (detalhes do cargo)         │
│  └── Viewport                               │
│       └── Map Wrapper                       │
│            └── SVG Network                  │
│                 ├── Paths Layer             │
│                 ├── Nodes Layer             │
│                 ├── Obstacles Layer         │
│                 ├── Paws Layer              │
│                 └── Fubá (personagem)       │
└─────────────────────────────────────────────┘
```

### 2. `src/App.tsx`

Adicionar nova rota:
```typescript
import FubaExplorer from "./pages/FubaExplorer";
// ...
<Route path="/trilha" element={<FubaExplorer />} />
```

## Dependência Externa

O código usa GSAP (GreenSock Animation Platform). Esta biblioteca será carregada via CDN dentro do componente, similar ao HTML original, usando:
- `gsap.min.js`
- `MotionPathPlugin.min.js`
- `Draggable.min.js`

Alternativa: Instalar via npm (`gsap`), mas como é um componente isolado, usar CDN é mais simples e não afeta o bundle principal.

## Dados de Carreira

Os dados estão hardcoded no HTML original:
- 17 nós (Estágio → CTO)
- Conexões entre nós
- Posições X/Y fixas no canvas

Serão mantidos inline no componente para simplicidade.

## Funcionalidades Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| Navegação por Fubá | Personagem caminha até o destino selecionado |
| Pegadas | Aparecem e desaparecem ao longo do caminho |
| Confetes | Celebração ao chegar no destino |
| Latido | Som e balão "AU AU!" ao completar navegação |
| Painel Lateral | Mostra detalhes do cargo selecionado |
| Sub-níveis | Ao clicar em um nó, mostra estrutura vertical |
| Zoom & Pan | Scroll para zoom, drag para mover |

## Detalhes Técnicos

### Estratégia de Integração do GSAP

O componente utilizará `useEffect` para:
1. Carregar scripts GSAP dinamicamente
2. Inicializar os plugins (MotionPathPlugin, Draggable)
3. Configurar os event listeners
4. Renderizar nós e caminhos no SVG

### Conversão de Estilos

Os estilos CSS do HTML serão convertidos para:
- CSS-in-JS inline via objeto `style`
- Classes CSS em um bloco `<style>` dentro do componente

### Rota Pública (sem sidebar)

A rota será pública/standalone, similar à rota `/trilhas` existente:
```typescript
<Route path="/trilha" element={<FubaExplorer />} />
```

Não será adicionada ao menu sidebar conforme solicitado.

## Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/pages/FubaExplorer.tsx` | Criar - Novo componente com toda a lógica do Fubá Explorer |
| `src/App.tsx` | Editar - Adicionar import e rota `/trilha` |
