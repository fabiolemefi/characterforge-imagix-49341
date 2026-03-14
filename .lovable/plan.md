

# Migração Completa do Efimagem

## Inventário

| Recurso | Quantidade |
|---|---|
| Plugin (Efimagem) | 1 registro na tabela `plugins` |
| Personagens (`plugin_characters`) | 10 (Rubens, Rubí, Greg, Fubá, Fernando Paiva, Igor Almeida, Regina Carvalho, Edson Ribeiro, Brindes, Criador de ADS) |
| Imagens de referência (`character_images`) | 45 imagens no bucket `plugin-images` |
| Imagens geradas (`generated_images`) | 148 registros |
| Edge Functions | 3 (`generate-character-image`, `edit-character-image`, `replicate-webhook`) |
| Componentes Frontend | 4 (`Efimagem.tsx`, `CharactersModal.tsx`, `ImageMaskEditor.tsx`, `ImageViewerModal.tsx`, `SelectCharacterModal.tsx`) |

## O que será criado

Um arquivo `docs/efimagem-migration.md` contendo:

1. **SQL completo de criação das tabelas** — `plugins`, `plugin_characters`, `character_images`, `generated_images` com schemas exatos, RLS policies e realtime
2. **SQL de INSERT com todos os dados** — o plugin Efimagem, os 10 personagens com seus prompts completos, e as 45 imagens de referência com URLs públicas atuais
3. **Edge Functions completas** — código integral das 3 funções (`generate-character-image`, `edit-character-image`, `replicate-webhook`) com instruções de config.toml
4. **Secrets necessários** — `REPLICATE_API_KEY` (obrigatório)
5. **Storage** — criação do bucket `plugin-images` (público)
6. **Componentes React** — paths e descrição dos 5 componentes necessários no frontend
7. **Prompt para LLM** — instruções completas para outra LLM recriar todo o sistema

### Sobre as imagens geradas (148)
As 148 imagens geradas NÃO serão incluídas nos INSERTs por padrão (são resultado de uso, não configuração). O documento indicará como exportá-las se necessário.

### Sobre os assets físicos
As URLs das 45 imagens de referência são públicas no bucket atual e continuarão funcionando. O documento incluirá opção de re-upload.

## Implementação

Será um único arquivo markdown: `docs/efimagem-migration.md`

