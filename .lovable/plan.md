
# Plano: Limpar CSS Tailwind do Campo global_css

## Problema Identificado

O campo `global_css` na tabela `efi_code_config` contém todo o CSS do Tailwind v4 (aproximadamente 30KB de CSS minificado). Isso está sendo exportado junto com o HTML porque a função `generateFullHtml` injeta o conteúdo de `global_css` diretamente no arquivo exportado.

### Causa Raiz

O CSS do Tailwind foi salvo acidentalmente no campo `global_css`. Isso pode ter acontecido de duas formas:
1. Durante a importação de um bloco HTML que continha uma tag `<style>` com Tailwind
2. Ao copiar/colar CSS de outra fonte que incluía o Tailwind

### Evidência

```sql
SELECT global_css FROM efi_code_config LIMIT 1;
-- Resultado: "/*! tailwindcss v4.1.18 | MIT License..."  (30KB+)
```

## Solucao

### Parte 1: Limpar o Banco de Dados

Executar uma migration para resetar o campo `global_css` para vazio ou para o CSS personalizado real (se houver):

```sql
UPDATE efi_code_config SET global_css = '';
```

### Parte 2: Prevenir Futuros Problemas (Opcional)

Adicionar validacao no hook `useEfiCodeConfig` ou no formulario de edicao para:
- Alertar se o CSS for muito grande (>10KB por exemplo)
- Bloquear CSS que contenha `tailwindcss` no conteudo

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Limpar o campo `global_css` |
| `src/hooks/useEfiCodeConfig.ts` (opcional) | Adicionar validacao de tamanho |

## Fluxo

```text
ANTES:
┌────────────────────────────────────────────┐
│ efi_code_config.global_css                 │
│ = "/*! tailwindcss v4.1.18..." (30KB)     │
└────────────────────────────────────────────┘
            ↓ exportar
┌────────────────────────────────────────────┐
│ HTML exportado inclui 30KB de Tailwind    │
│ (desnecessario e incorreto)               │
└────────────────────────────────────────────┘

DEPOIS:
┌────────────────────────────────────────────┐
│ efi_code_config.global_css = ""           │
│ (ou CSS personalizado pequeno)            │
└────────────────────────────────────────────┘
            ↓ exportar
┌────────────────────────────────────────────┐
│ HTML exportado limpo, apenas estilos      │
│ basicos + CSS personalizado               │
└────────────────────────────────────────────┘
```

## Resultado Esperado

O HTML exportado tera apenas:
- Estilos basicos do Efi Code (box-sizing, body, page-container)
- CSS personalizado definido pelo usuario (se houver)
- Nenhum CSS de framework externo
