

## Plano: Imagem de Background nas Configurações da Página

### Objetivo

Adicionar à seção "Layout" das configurações da página:
1. Upload de imagem de fundo (salvando no bucket `efi-code-assets`)
2. Configurações de como a imagem se comporta (size, position, attachment)

---

### Novos Campos no `PageSettings`

| Campo | Tipo | Valores | CSS Gerado |
|-------|------|---------|------------|
| `backgroundImage` | string | URL da imagem | `background-image: url(...)` |
| `backgroundSize` | string | `cover`, `contain`, `auto` | `background-size: ...` |
| `backgroundPosition` | string | `center`, `top`, `bottom`, etc. | `background-position: ...` |
| `backgroundAttachment` | string | `scroll`, `fixed` | `background-attachment: ...` |
| `backgroundRepeat` | string | `no-repeat`, `repeat`, `repeat-x`, `repeat-y` | `background-repeat: ...` |

---

### Interface de Usuário

Na seção "Layout" do `SettingsPanel`, após a cor de fundo:

```text
┌─────────────────────────────────────────┐
│  📐 Layout                              │
├─────────────────────────────────────────┤
│  Largura máxima: [1200______]           │
│                                         │
│  Cor de fundo: [🎨][#ffffff___]         │
│                                         │
│  Imagem de fundo:                       │
│  ┌─────────────────────────────────────┐│
│  │ [Preview da imagem se existir]     ││
│  │ [📤 Upload] [🗑️ Remover]           ││
│  └─────────────────────────────────────┘│
│  [URL da imagem_______________]         │
│                                         │
│  Tamanho:                               │
│  [Cobrir tudo ▾] (cover/contain/auto)   │
│                                         │
│  Posição:                               │
│  [Centro ▾] (center/top/bottom/left/...)│
│                                         │
│  Comportamento:                         │
│  [Rolar junto ▾] (scroll/fixed)         │
│                                         │
│  Repetição:                             │
│  [Não repetir ▾]                        │
└─────────────────────────────────────────┘
```

---

### Opções dos Selects

**Tamanho (`backgroundSize`):**
- `cover` - "Cobrir tudo" (imagem cobre toda a área)
- `contain` - "Conter" (imagem inteira visível)
- `auto` - "Tamanho original"

**Posição (`backgroundPosition`):**
- `center` - "Centro"
- `top` - "Topo"
- `bottom` - "Inferior"
- `left` - "Esquerda"
- `right` - "Direita"
- `top left` - "Topo esquerda"
- `top right` - "Topo direita"
- `bottom left` - "Inferior esquerda"
- `bottom right` - "Inferior direita"

**Comportamento (`backgroundAttachment`):**
- `scroll` - "Rolar junto" (imagem rola com a página)
- `fixed` - "Fixo" (imagem fica parada enquanto conteúdo rola)

**Repetição (`backgroundRepeat`):**
- `no-repeat` - "Não repetir"
- `repeat` - "Repetir"
- `repeat-x` - "Repetir horizontalmente"
- `repeat-y` - "Repetir verticalmente"

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useEfiCodeSites.ts` | Adicionar campos de background na interface `PageSettings` e `defaultPageSettings` |
| `src/components/eficode/editor/SettingsPanel.tsx` | Adicionar upload de imagem e selects de configuração na seção Layout |
| `src/lib/efiCodeHtmlGenerator.ts` | Aplicar estilos de background-image no body do HTML gerado |

---

### Alterações Detalhadas

#### 1. `useEfiCodeSites.ts` - Interface PageSettings

```typescript
export interface PageSettings {
  // ... campos existentes
  backgroundColor: string;
  // Novos campos:
  backgroundImage: string;
  backgroundSize: string;      // 'cover' | 'contain' | 'auto'
  backgroundPosition: string;  // 'center' | 'top' | etc.
  backgroundAttachment: string; // 'scroll' | 'fixed'
  backgroundRepeat: string;    // 'no-repeat' | 'repeat' | etc.
}

export const defaultPageSettings: PageSettings = {
  // ... valores existentes
  backgroundColor: '#ffffff',
  // Novos valores padrão:
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'scroll',
  backgroundRepeat: 'no-repeat',
};
```

#### 2. `SettingsPanel.tsx` - Upload e Configurações

- Adicionar função `handleBackgroundUpload` (similar ao `handleFaviconUpload`)
- Adicionar preview da imagem com botão de remover
- Adicionar 4 `Select` para as configurações de posicionamento/comportamento

#### 3. `efiCodeHtmlGenerator.ts` - CSS do Body

```typescript
body { 
  font-family: system-ui, -apple-system, sans-serif; 
  background-color: ${pageSettings.backgroundColor || '#ffffff'};
  ${pageSettings.backgroundImage ? `
    background-image: url('${pageSettings.backgroundImage}');
    background-size: ${pageSettings.backgroundSize || 'cover'};
    background-position: ${pageSettings.backgroundPosition || 'center'};
    background-attachment: ${pageSettings.backgroundAttachment || 'scroll'};
    background-repeat: ${pageSettings.backgroundRepeat || 'no-repeat'};
  ` : ''}
  min-height: 100vh;
}
```

---

### Fluxo de Upload

1. Usuário clica em "Upload" na seção de imagem de fundo
2. Arquivo é enviado para `efi-code-assets/backgrounds/bg-{timestamp}.{ext}`
3. URL pública é salva em `pageSettings.backgroundImage`
4. Preview é exibido no painel
5. Ao exportar/preview, a imagem é aplicada no body via CSS

---

### Resultado Final

- Upload funcional com preview da imagem
- Configurações intuitivas com selects traduzidos
- HTML exportado com background-image aplicado corretamente
- Suporte a background fixo para efeito parallax

