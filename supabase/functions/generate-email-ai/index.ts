import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um especialista em criação de emails marketing profissionais HTML.

BLOCOS DISPONÍVEIS e quando usar:
- header: Logo e cabeçalho da marca (SEMPRE no topo, obrigatório)
- hero: Imagem de destaque + título principal chamativo (usar para chamada principal do email)
- text: Parágrafos de texto corrido, histórias, explicações detalhadas
- image: Imagens ilustrativas independentes para quebra visual
- cta: Botões de ação com links (usar quando precisar de ação do usuário)
- separator: Linha divisória decorativa (usar entre SEÇÕES diferentes, não entre cada parágrafo)
- footer: Rodapé com informações de contato (SEMPRE no final, obrigatório)

REGRAS OBRIGATÓRIAS DE COMPOSIÇÃO:
1. SEMPRE começar com "header"
2. SEMPRE terminar com "footer"
3. Use "hero" logo após o header para chamada principal
4. Use "text" para conteúdo textual (histórias, explicações, descrições)
5. Use "cta" após conteúdo que requer uma ação do usuário
6. Use "separator" apenas entre seções COMPLETAMENTE diferentes (não entre parágrafos da mesma seção)
7. Use "image" para ilustrações visuais quando apropriado
8. Não exagere nos separators - use com moderação

FORMATO DE CONTEÚDO:
- Para "text": use HTML simples com <h2>, <h3>, <p>, <strong>, etc
- Para "cta": forneça texto do botão e URL
- Para "hero": forneça título e subtítulo
- Para "header", "footer", "separator", "image": content pode ser null

Você DEVE retornar APENAS um JSON válido, SEM markdown, SEM explicações, no EXATO formato:
{
  "subject": "assunto atraente do email",
  "preview_text": "texto de preview curto e interessante",
  "blocks": [
    {
      "type": "header",
      "category": "header",
      "content": null
    },
    {
      "type": "hero",
      "category": "hero",
      "content": {
        "title": "Título Principal",
        "subtitle": "Subtítulo complementar"
      }
    },
    {
      "type": "text",
      "category": "content",
      "content": {
        "text": "<h3>Título da Seção</h3><p>Texto do parágrafo...</p>"
      }
    }
  ]
}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description } = await req.json()
    
    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Descrição é obrigatória" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY não configurada')
    }

    console.log("Gerando email com IA para:", description)

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    const output = await replicate.run(
      "meta/meta-llama-3.1-405b-instruct",
      {
        input: {
          prompt: `${SYSTEM_PROMPT}

DESCRIÇÃO DO EMAIL:
${description}

Lembre-se:
- Sempre começar com header
- Sempre terminar com footer
- Use hero para a chamada principal
- Use separator com moderação (só entre seções diferentes)
- Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown`,
          temperature: 0.7,
          max_tokens: 3000,
          top_p: 0.9,
        }
      }
    )

    console.log("Resposta da IA:", output)

    // Parse the output - it comes as an array of strings
    let responseText = ''
    if (Array.isArray(output)) {
      responseText = output.join('')
    } else if (typeof output === 'string') {
      responseText = output
    } else {
      responseText = JSON.stringify(output)
    }

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    responseText = responseText.trim()

    console.log("Texto processado:", responseText)

    // Parse JSON
    const emailStructure = JSON.parse(responseText)

    // Validate structure
    if (!emailStructure.subject || !emailStructure.blocks || !Array.isArray(emailStructure.blocks)) {
      throw new Error("Estrutura de resposta inválida da IA")
    }

    // Ensure first block is header and last is footer
    if (emailStructure.blocks[0]?.type !== 'header') {
      emailStructure.blocks.unshift({
        type: 'header',
        category: 'header',
        content: null
      })
    }

    const lastBlock = emailStructure.blocks[emailStructure.blocks.length - 1]
    if (lastBlock?.type !== 'footer') {
      emailStructure.blocks.push({
        type: 'footer',
        category: 'footer',
        content: null
      })
    }

    console.log("Estrutura final:", JSON.stringify(emailStructure))

    return new Response(JSON.stringify(emailStructure), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Erro na função generate-email-ai:", error)
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao gerar email com IA",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
