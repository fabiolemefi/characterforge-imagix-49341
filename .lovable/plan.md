

# Migração da Biblioteca de Imagens e Ícones

## Inventário Atual

| Tabela | Registros |
|---|---|
| `efi_image_categories` | 3 (Hero, Sede, Sys) |
| `efi_library_images` | 3 |
| `efi_library_icons` | 363 (grupos: `geral`, `ilustra`) |

Todos os arquivos estão no bucket público `efi-code-assets` com URLs públicas acessíveis.

## Plano de Entrega

Vou criar um arquivo `docs/library-migration.md` contendo:

1. **SQL de criação das 3 tabelas** (`efi_image_categories`, `efi_library_images`, `efi_library_icons`) com schemas exatos, RLS policies e triggers
2. **SQL de INSERT com todos os dados** — as 3 categorias, 3 imagens e 363 ícones com todas as URLs atuais
3. **Instruções de storage** — criação do bucket `efi-code-assets` e estrutura de pastas
4. **Prompt detalhado para LLM** — instruções completas para a outra LLM recriar o sistema no novo projeto
5. **Hook TypeScript completo** (`useEfiImageLibrary.ts` e `useEfiLibraryIcons.ts`) e o componente `ImagePickerModal`
6. **Nota sobre arquivos** — as URLs atuais são públicas e continuarão funcionando, mas se quiser independência total, precisa re-upload dos assets para o novo bucket

### Sobre os assets físicos
As URLs dos arquivos (imagens PNG e ícones SVG) são públicas no storage atual. O documento incluirá:
- Opção A: Manter as URLs atuais (funciona imediatamente)
- Opção B: Script/instruções para baixar e re-upload no novo storage

