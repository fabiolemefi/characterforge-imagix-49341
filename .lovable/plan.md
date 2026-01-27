
# Plano: Corrigir Verificação de Conexão da Extensão no Efi Code

## Problema Identificado

A função `checkExtensionInstalled()` no `extensionProxy.ts` verifica `response.success`, mas deveria verificar `response.configured` para saber se a extensão está configurada com as credenciais do Marketing Cloud.

| Arquivo | Verificação Atual | Verificação Correta |
|---------|------------------|---------------------|
| `extensionProxy.ts` | `response.success` | `response.configured` |
| `EmailTemplates.tsx` | `response.configured` | (correto) |

## Resposta da Extensão

Quando a extensão está instalada e configurada, ela retorna:
```json
{ "success": true, "configured": true }
```

- `success: true` = extensão instalada e respondendo
- `configured: true` = credenciais SFMC configuradas no popup

## Solução

Modificar a função `checkExtensionInstalled()` para verificar `response.configured`:

**Arquivo:** `src/lib/extensionProxy.ts`

```typescript
export async function checkExtensionInstalled(): Promise<boolean> {
  const response = await sendToExtension('CHECK_EXTENSION');
  return response.configured === true;  // Verificar se está CONFIGURADA
}
```

## Impacto

Esta correção afeta todos os lugares que usam `checkExtensionInstalled()`:
- `/efi-code` - Sites Online (o problema atual)
- Qualquer outro componente que use esta função

O `/email-templates` não é afetado pois usa sua própria implementação local de `checkExtension()`.
