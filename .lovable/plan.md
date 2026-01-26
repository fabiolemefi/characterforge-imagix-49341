

# Plano: Restaurar CSS Global do Efi Code

## Problema Identificado

O CSS global foi removido do banco de dados, mas ele era **necessário** para os blocos HTML funcionarem corretamente. Os blocos importados (como o formulário de pesquisa da Efí Bank) usam classes CSS que dependem desse CSS global.

### Situacao Atual

```text
┌─────────────────────────────────────────────────────┐
│ Blocos HTML importados:                             │
│   - Usam classes: bg-elevation-2, text-base-medium  │
│   - Essas classes vêm do CSS Tailwind v4            │
│                                                     │
│ Campo global_css:                                   │
│   - Foi limpo (vazio)                               │
│   - Resultado: blocos sem estilização               │
└─────────────────────────────────────────────────────┘
```

## Causa do Problema

O CSS do Tailwind v4 que estava no campo `global_css` **não era lixo** - ele é o CSS necessário para os blocos HTML funcionarem. Quando um bloco HTML é importado com classes Tailwind, o CSS correspondente deve estar no campo `global_css` para que essas classes sejam interpretadas.

## Solucao

### Opcao 1: Restaurar CSS via Admin (Recomendado)

1. Acesse: **Admin > Plugins > Efi Code Blocos** (ícone de engrenagem)
2. Clique no botão **"CSS Global"**
3. Cole o CSS do Tailwind v4 (ou o CSS personalizado que seus blocos precisam)
4. Clique em **"Salvar CSS"**

### Opcao 2: Restaurar CSS via Banco de Dados

Executar SQL para restaurar o CSS diretamente no banco:

```sql
UPDATE efi_code_config 
SET global_css = '[conteúdo do CSS do Tailwind v4]', 
    updated_at = now();
```

## Fluxo Correto de Uso

```text
┌─────────────────────────────────────────────────────┐
│ 1. Admin importa bloco HTML com classes Tailwind   │
│    (ex: classes bg-elevation-2, text-base-medium)  │
├─────────────────────────────────────────────────────┤
│ 2. Admin cadastra CSS correspondente em:           │
│    Admin > Efi Code Blocos > CSS Global            │
├─────────────────────────────────────────────────────┤
│ 3. CSS é armazenado em efi_code_config.global_css  │
├─────────────────────────────────────────────────────┤
│ 4. Editor e exportação usam esse CSS:              │
│    - Editor: injeta via <style> no viewport        │
│    - Exportação: inclui no <head> do HTML final    │
└─────────────────────────────────────────────────────┘
```

## Resultado Esperado

Apos restaurar o CSS global:
- Editor mostrará os blocos estilizados corretamente
- Exportação incluirá o CSS no arquivo HTML final
- Os blocos serão renderizados como esperado

## Acao Imediata

Para resolver agora, você pode:
1. Ir em **Admin > Plugins** (ícone de engrenagem ao lado de Efi Code)
2. Clicar em **"CSS Global"** 
3. Colar o CSS do Tailwind v4 que seus blocos usam
4. Salvar

Isso restaurará a estilização tanto no editor quanto na exportação.

