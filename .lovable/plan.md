
# Plano: Corrigir Parsing de Resposta do Shortener

## Problema Identificado

O endpoint `https://shortener.gerencianet.com.br` está retornando **HTTP 200 com conteúdo HTML** em vez de JSON. Isso acontece quando:

1. O endpoint faz um redirect que termina em uma página HTML
2. O servidor retorna uma página de erro com status 200
3. A API mudou o formato de resposta

O código atual assume que se `response.ok` é `true`, o conteúdo é JSON válido. Quando tenta fazer `response.json()` em HTML, ocorre o erro:
```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Solução

Adicionar validação do `Content-Type` da resposta antes de tentar fazer parse como JSON, com mensagens de erro mais descritivas.

## Arquivo a Modificar

### `chrome-extension-sfmc-proxy/background.js`

**Função `shortenUrl()` (linhas 452-483)**

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

  // Log da URL final (para debug de redirects)
  console.log("[Efí Link] URL final após redirects:", response.url);
  console.log("[Efí Link] Status:", response.status);
  console.log("[Efí Link] Content-Type:", response.headers.get('content-type'));

  // Verificar se a resposta foi redirecionada para outro domínio
  if (!response.url.includes('shortener.gerencianet.com.br')) {
    const responseText = await response.text();
    console.error("[Efí Link] Redirect inesperado para:", response.url);
    console.error("[Efí Link] Conteúdo:", responseText.substring(0, 500));
    throw new Error(`API redirecionou para ${response.url}. Verifique se o serviço está disponível.`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Efí Link] Erro ao encurtar:", errorText);
    throw new Error(`Erro ao encurtar URL: ${response.status}`);
  }

  // Verificar Content-Type antes de fazer parse
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const responseText = await response.text();
    console.error("[Efí Link] Resposta não é JSON:", responseText.substring(0, 500));
    throw new Error(`API retornou ${contentType || 'formato desconhecido'} em vez de JSON. O serviço pode estar indisponível.`);
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

## Principais Melhorias

| Verificação | Propósito |
|-------------|-----------|
| `response.url` | Detecta se houve redirect para outro domínio |
| `Content-Type` header | Valida se a resposta é JSON antes do parse |
| Logs detalhados | Facilita debug mostrando URL final, status e tipo de conteúdo |
| Mensagens de erro claras | Explica o problema ao usuário (ex: "API retornou HTML") |

## Diagnóstico Adicional

Após implementar, os logs vão mostrar:
- Para onde a API está redirecionando
- Qual Content-Type está retornando
- Primeiros 500 caracteres do HTML de erro

Isso vai ajudar a entender se é um problema temporário do serviço ou se o endpoint correto é outro.

## Possível Causa Raiz

O redirect para `sejaefi.com.br` pode indicar que o endpoint `shortener.gerencianet.com.br` foi desativado ou movido. Os logs vão confirmar isso após a implementação.
