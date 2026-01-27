
# Plano: Correção do Erro "Ação desconhecida: LIST_CLOUDPAGE"

## Diagnóstico

O código está **correto** em todos os arquivos:

| Arquivo | Valor | Status |
|---------|-------|--------|
| `extensionProxy.ts` linha 80 | `sendToExtension('LIST_CLOUDPAGES', ...)` | Correto (plural) |
| `background.js` linha 548 | `case "LIST_CLOUDPAGES":` | Correto (plural) |
| `background.js` linha 211 | `listCloudPagesFromSfmc(...)` | Função existe |

O erro `Ação desconhecida: LIST_CLOUDPAGE` (singular) indica que a **extensão Chrome instalada localmente está desatualizada**.

## Causa Raiz

As extensões Chrome carregadas via "Load unpacked" não atualizam automaticamente quando os arquivos são modificados. O `background.js` na extensão que está rodando no navegador ainda não tem os handlers `LIST_CLOUDPAGES`, `GET_CLOUDPAGE` e `DELETE_CLOUDPAGE`.

## Solução

O usuário precisa **recarregar a extensão** no Chrome:

### Passos para Atualizar a Extensão

1. Abrir o Chrome e ir para `chrome://extensions`
2. Localizar a extensão **"Mágicas do Fábio"**
3. Clicar no botão **"Recarregar"** (ícone de refresh circular)
4. Voltar ao Lovable e testar a aba "Sites Online"

Alternativamente:
- Habilitar o "Modo desenvolvedor" (toggle no canto superior direito)
- Remover a extensão atual
- Clicar em "Carregar sem compactação"
- Selecionar a pasta `chrome-extension-sfmc-proxy` novamente

## Verificação

Após recarregar, ao abrir a aba "Sites Online":
- O indicador verde deve aparecer (extensão conectada)
- A lista de Cloud Pages do Marketing Cloud deve carregar
- Não deve aparecer mais o erro "Ação desconhecida"

## Sem Alterações de Código

Não são necessárias alterações no código. O problema é apenas sincronização da extensão local.
