
# Plano: Corrigir Persistência de Edições no Código HTML do HtmlBlock

## Problema Identificado

Quando o usuário edita o código HTML diretamente no Textarea do painel "Propriedades" (seção "Código HTML"), as alterações não são persistidas. Ao digitar e tentar salvar, o bloco recarrega com o conteúdo anterior.

## Análise Técnica

O problema está na forma como o Textarea no `HtmlBlockSettings` gerencia o estado:

```text
+-------------------+     setProp()     +------------------+
|    Textarea       | ----------------> |   Craft.js       |
|  value={template} |                   |   Node Props     |
+-------------------+                   +------------------+
        ^                                       |
        |                                       |
        +----------- re-render -----------------+
```

**Causa raiz**: O Craft.js usa atualizações assíncronas via `setProp`. Quando o Textarea dispara `onChange`, ele chama `setProp`, mas antes que o Craft.js atualize as props, o React pode re-renderizar o componente com o valor antigo (pois `template` ainda não foi atualizado).

Isso causa uma "corrida" onde:
1. Usuário digita caractere
2. `onChange` dispara `setProp`
3. React re-renderiza antes do Craft.js atualizar
4. Textarea recebe `value` antigo
5. Edição é perdida

## Solução

Implementar um **estado local controlado** no `HtmlBlockSettings` que sincroniza com as props do Craft.js de forma debounced.

### Estratégia

1. Criar estado local `localTemplate` para controlar o Textarea
2. Sincronizar do Craft.js para o local ao montar/mudar seleção
3. Debounce a sincronização do local para o Craft.js
4. Evitar loops de atualização infinitos com uma flag de controle

### Arquivo a Modificar

**`src/components/eficode/user-components/HtmlBlock.tsx`**

### Alterações no `HtmlBlockSettings`:

```typescript
export const HtmlBlockSettings = () => {
  const { actions: { setProp }, ...nodeProps } = useNode((node) => ({
    ...node.data.props,
  }));

  const propsTemplate = nodeProps.htmlTemplate || nodeProps.html || '';
  
  // Local state for controlled textarea
  const [localTemplate, setLocalTemplate] = useState(propsTemplate);
  const isInternalUpdate = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from Craft.js props to local state (only external changes)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      setLocalTemplate(propsTemplate);
    }
    isInternalUpdate.current = false;
  }, [propsTemplate]);

  // Handle textarea change with debounced Craft.js sync
  const handleTemplateChange = (value: string) => {
    setLocalTemplate(value);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the Craft.js update
    debounceRef.current = setTimeout(() => {
      isInternalUpdate.current = true;
      setProp((props: any) => {
        props.htmlTemplate = value;
        props.html = value;
      });
    }, 300); // 300ms debounce
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ... rest of component uses localTemplate instead of template
  
  return (
    <div className="space-y-4">
      {/* ... images section unchanged ... */}
      
      {/* Template editor - now uses localTemplate */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Código HTML</Label>
        <Textarea
          value={localTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          placeholder="<div>Seu HTML aqui</div>"
          rows={12}
          className="font-mono text-xs bg-secondary/50 border-border"
        />
      </div>
      
      {/* ... placeholders and css classes unchanged ... */}
    </div>
  );
};
```

## Alterações Detalhadas

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Estado do Textarea | Direto das props (`template`) | Local controlado (`localTemplate`) |
| `onChange` | `setProp` imediato | Atualiza local + debounce para Craft.js |
| Sincronização | Nenhuma | `useEffect` bidirecional com flag |
| Debounce | Não havia | 300ms para reduzir re-renders |

## Fluxo Corrigido

```text
Usuário digita
      |
      v
setLocalTemplate(value)  <-- Estado local atualizado IMEDIATO
      |
      +---> Textarea mostra valor correto
      |
      +---> setTimeout 300ms
                |
                v
           isInternalUpdate = true
                |
                v
           setProp() --> Craft.js atualiza
                |
                v
           useEffect detecta mudança de propsTemplate
                |
                v
           isInternalUpdate é true? SIM --> ignora sync
                |
                v
           isInternalUpdate = false (reset)
```

## Benefícios

1. **Resposta imediata**: O Textarea atualiza instantaneamente ao digitar
2. **Sem perda de dados**: O estado local preserva as edições
3. **Performance**: Debounce reduz atualizações ao Craft.js
4. **Histórico funcional**: O `setProp` ainda é chamado, registrando no undo/redo
5. **Sincronização correta**: Mudanças externas (ex: substituição de imagem) são refletidas

## Impacto

Esta correção afeta apenas o componente `HtmlBlockSettings`. O comportamento do `HtmlBlock` visual (contentEditable) permanece inalterado.
