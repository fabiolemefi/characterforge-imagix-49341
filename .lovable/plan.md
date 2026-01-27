
# Plano: Corrigir Erro de CORS no Redirect do Encurtador

## Problema

O endpoint `https://shortener.gerencianet.com.br` está retornando um **redirect (301/302)** para `https://sejaefi.com.br/`. Como a extensão não tem permissão para esse domínio de destino, o CORS bloqueia a requisição.

## Solução

Precisamos fazer três correções:

### 1. Adicionar permissão para `sejaefi.com.br` no manifest

**Arquivo:** `chrome-extension-sfmc-proxy/manifest.json`

```json
"host_permissions": [
  "https://*.exacttargetapis.com/*",
  "https://*.salesforce.com/*",
  "https://*.marketingcloudapis.com/*",
  "https://gnetbr.com/*",
  "https://shortener.gerencianet.com.br/*",
  "https://*.gerencianet.com.br/*",
  "https://sejaefi.com.br/*",
  "https://*.sejaefi.com.br/*"
]
```

### 2. Adicionar regra de CORS para `sejaefi.com.br`

**Arquivo:** `chrome-extension-sfmc-proxy/rules.json`

Adicionar uma nova regra para cobrir o domínio de destino do redirect:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "Origin", "operation": "remove" },
        { "header": "Referer", "operation": "set", "value": "https://gerencianet.com.br/" },
        { "header": "Sec-Fetch-Dest", "operation": "set", "value": "empty" },
        { "header": "Sec-Fetch-Mode", "operation": "set", "value": "cors" },
        { "header": "Sec-Fetch-Site", "operation": "set", "value": "same-origin" }
      ]
    },
    "condition": {
      "urlFilter": "shortener.gerencianet.com.br",
      "resourceTypes": ["xmlhttprequest"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "Origin", "operation": "remove" },
        { "header": "Referer", "operation": "set", "value": "https://sejaefi.com.br/" },
        { "header": "Sec-Fetch-Dest", "operation": "set", "value": "empty" },
        { "header": "Sec-Fetch-Mode", "operation": "set", "value": "cors" },
        { "header": "Sec-Fetch-Site", "operation": "set", "value": "same-origin" }
      ]
    },
    "condition": {
      "urlFilter": "sejaefi.com.br",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

### 3. Usar `redirect: 'follow'` explícito e adicionar credentials

**Arquivo:** `chrome-extension-sfmc-proxy/background.js`

Modificar a função `shortenUrl()` para lidar melhor com redirects:

```javascript
async function shortenUrl(url) {
  console.log("[Efí Link] Encurtando URL:", url);

  const response = await fetch("https://shortener.gerencianet.com.br", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ url }),
    redirect: 'follow',
    credentials: 'omit',
    mode: 'cors',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Efí Link] Erro ao encurtar:", errorText);
    throw new Error(`Erro ao encurtar URL: ${response.status}`);
  }

  const data = await response.json();
  console.log("[Efí Link] URL encurtada:", data.shorted_url);

  return {
    success: true,
    id: data.id,
    original_url: data.original_url,
    shorted: data.shorted,
    shorted_url: data.shorted_url,
  };
}
```

Aplicar as mesmas alterações em `testEfiLinkConnection()` (linhas 79-95).

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `manifest.json` | Adicionar `sejaefi.com.br` e `*.sejaefi.com.br` às permissões |
| `rules.json` | Adicionar nova regra de CORS bypass para `sejaefi.com.br` |
| `background.js` | Adicionar opções de fetch: `redirect`, `credentials`, `mode` |

## Após as Alterações

O usuário precisará **recarregar a extensão** no Chrome:
1. Ir para `chrome://extensions`
2. Clicar no botão de reload na extensão
3. Testar novamente o encurtamento de URL
