

# Plano: Corrigir Flickering e Linhas em Branco no Editor

## Problema Identificado

O problema ocorre devido a um ciclo vicioso de atualizações de estado quando o bloco HTML é re-selecionado:

### Causa Raiz

1. **Quando o bloco perde foco**: O evento `blur` dentro do iframe dispara `onEditEnd` com o HTML atual
2. **onEditEnd atualiza o state do Craft.js**: Chama `setProp` para atualizar `htmlTemplate` e `html`
3. **Craft.js re-renderiza o componente**: A mudança de props causa re-render do HtmlBlock
4. **O textarea do SettingsPanel tambem reage**: O valor do template muda, causando re-render do painel
5. **Ao clicar novamente no bloco**: O srcdoc do iframe e recriado com HTML que pode ter sido modificado pelo contentEditable do navegador (que adiciona elementos extras ou formatacao)
6. **Loop**: O processo se repete, cada vez adicionando mais caracteres/linhas

### Sintomas Observados

- **Flickering**: O iframe sendo recriado a cada mudanca de estado
- **Linhas em branco**: O `innerHTML` do body do iframe inclui formatacao adicional do contentEditable (newlines, espacos)

## Fluxo Problematico Atual

```text
Usuario clica fora do bloco
         |
         v
    blur event no iframe
         |
         v
 postMessage('eficode-edit-end', innerHTML)
         |
         v
  onEditEnd atualiza props do Craft.js
         |
         v
   HtmlBlock re-renderiza
         |
         v
IframePreview recria o srcdoc (CAUSA O FLICKER)
         |
         v
Usuario clica no bloco novamente
         |
         v
  O HTML agora tem linhas extras do contentEditable
         |
         v
    Ciclo se repete
```

## Solucao

### Parte 1: Evitar Re-criacao do Iframe Durante Edicao

Modificar `IframePreview.tsx` para:
- Usar `useRef` para armazenar o HTML inicial quando entra em modo de edicao
- Nao recriar o srcdoc se o HTML nao mudou significativamente
- Adicionar debounce nas atualizacoes

### Parte 2: Sanitizar HTML ao Sair do Modo de Edicao

Modificar `HtmlBlock.tsx` para:
- Normalizar o HTML recebido do iframe (remover espacos extras, linhas em branco consecutivas)
- Comparar HTML novo com o antigo antes de atualizar o state

### Parte 3: Desacoplar Textarea do SettingsPanel

O problema das linhas em branco no painel direito e porque:
1. O usuario edita visualmente no iframe
2. O textarea do settings mostra o HTML que esta sendo modificado em tempo real
3. A cada keystroke, o innerHTML do body tem formatacao diferente

Solucao: Atualizar o textarea apenas quando o usuario termina de editar (onEditEnd), nao durante a edicao

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/eficode/user-components/IframePreview.tsx` | Estabilizar srcdoc durante edicao |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Sanitizar HTML e controlar atualizacoes |

## Codigo Proposto

### IframePreview.tsx - Estabilizar Durante Edicao

```typescript
// Usar ref para "travar" o HTML quando entra em modo de edicao
const [lockedHtml, setLockedHtml] = useState<string | null>(null);

useEffect(() => {
  if (editable && !lockedHtml) {
    // Ao entrar em modo de edicao, travar o HTML atual
    setLockedHtml(html);
  } else if (!editable && lockedHtml) {
    // Ao sair do modo de edicao, liberar
    setLockedHtml(null);
  }
}, [editable]);

// Usar o HTML travado durante edicao para evitar recriacao do iframe
const stableHtml = lockedHtml || html;
```

### HtmlBlock.tsx - Sanitizar e Evitar Updates Desnecessarios

```typescript
// Funcao para normalizar HTML
const normalizeHtml = (html: string): string => {
  return html
    .replace(/\n\s*\n/g, '\n')  // Remover linhas em branco consecutivas
    .replace(/^\s+|\s+$/g, '')   // Trim
    .replace(/>\s+</g, '><');    // Remover espacos entre tags
};

const handleEditEnd = useCallback((finalHtml: string) => {
  const normalized = normalizeHtml(finalHtml);
  const currentNormalized = normalizeHtml(template);
  
  // So atualizar se realmente mudou
  if (normalized !== currentNormalized) {
    setProp((props: any) => {
      props.htmlTemplate = normalized;
      props.html = normalized;
    });
  }
  setIsEditing(false);
}, [setProp, template]);
```

## Resultado Esperado

Apos as correcoes:
- Bloco nao pisca ao re-selecionar
- Codigo HTML no painel direito permanece estavel
- Edicao visual funciona suavemente
- Nao ha acumulo de linhas em branco

