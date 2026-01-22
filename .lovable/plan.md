
# Plano: Atualizar Comentário no index.html

## Situação Atual

O comentário já existe no arquivo `index.html` na linha 38, porém com grafia diferente do desejado.

## Alteração

Atualizar o texto do comentário para a versão correta:

| Antes | Depois |
|-------|--------|
| ESPIRANDO | ESPIANDO |
| VIBE | VAIBE |

## Implementação

Editar a linha 38 do `index.html`:

```html
<!-- De: -->
<!-- IIHH, ALÁ UM DEV ESPIRANDO MEUS VIBE CODY! SAI PRA LÁ SEU DEBUGADOR! -->

<!-- Para: -->
<!-- IIHH, ALÁ UM DEV ESPIANDO MEUS VAIBE CODY! SAI PRA LÁ SEU DEBUGADOR! -->
```

## Nota Técnica

Se o comentário está desaparecendo após o deploy, isso pode ocorrer porque:

1. **Minificação do HTML**: Alguns processos de build removem comentários HTML para reduzir o tamanho do arquivo
2. **Cache do CDN**: A versão cacheada pode estar sendo servida

O Vite por padrão preserva comentários em arquivos HTML, então o comentário deve persistir após o deploy com esta atualização.

---

**Arquivo a ser editado:** `index.html` (linha 38)
