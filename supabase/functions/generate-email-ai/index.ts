import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um especialista em criação de emails marketing profissionais HTML.

BLOCOS DISPONÍVEIS NO BANCO DE DADOS:
1. Header (categoria: header) - Cabeçalho com logo
2. Welcome (categoria: header) - Mensagem de boas-vindas com título personalizado
3. Title (categoria: content) - Título de seção
4. Paragrafo (categoria: content) - Parágrafo de texto corrido
5. Image (categoria: content) - Imagem ilustrativa
6. button (categoria: content) - Botão de call-to-action
7. Divisor (categoria: content) - Linha separadora
8. Signature (categoria: content) - Assinatura/despedida final

REGRAS OBRIGATÓRIAS DE COMPOSIÇÃO:
1. SEMPRE começar com "Header" (category: header, name: Header)
2. Depois do Header, use "Welcome" se tiver uma mensagem de boas-vindas personalizada
3. Use "Title" para títulos de seções
4. Use "Paragrafo" para textos explicativos, histórias, descrições
5. Use "button" APENAS quando precisar de botão de ação com link
6. Use "Divisor" entre seções DIFERENTES (com moderação)
7. Use "Image" para ilustrações quando apropriado
8. SEMPRE terminar com "Signature" (category: content, name: Signature)

FORMATO DE CONTEÚDO:
- Para "Welcome": forneça title (texto principal de boas-vindas)
- Para "Title": forneça title (título da seção)
- Para "Paragrafo": forneça text (HTML com <p>, <strong>, etc)
- Para "button": forneça button_text e url
- Para "Header", "Divisor", "Signature", "Image": content pode ser null

IMPORTANTE: Use o campo "name" exatamente como listado acima (case-sensitive)!

Você DEVE retornar APENAS um JSON válido, SEM markdown, SEM explicações, no EXATO formato:
{
  "subject": "assunto atraente do email",
  "preview_text": "texto de preview curto e interessante",
  "blocks": [
    {
      "name": "Header",
      "category": "header",
      "content": null
    },
    {
      "name": "Welcome",
      "category": "header",
      "content": {
        "title": "Bem-vindo!"
      }
    },
    {
      "name": "Title",
      "category": "content",
      "content": {
        "title": "Título da Seção"
      }
    },
    {
      "name": "Paragrafo",
      "category": "content",
      "content": {
        "text": "<p>Texto do parágrafo aqui...</p>"
      }
    },
    {
      "name": "button",
      "category": "content",
      "content": {
        "button_text": "Clique Aqui",
        "url": "https://exemplo.com"
      }
    },
    {
      "name": "Signature",
      "category": "content",
      "content": null
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

Lembre-se de usar exatamente os nomes dos blocos listados: Header, Welcome, Title, Paragrafo, button, Divisor, Signature.
Sempre começar com Header e terminar com Signature.
Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown.`,
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

    // Ensure first block is Header and last is Signature
    const firstBlock = emailStructure.blocks[0]
    if (!firstBlock || firstBlock.name !== 'Header') {
      emailStructure.blocks.unshift({
        name: 'Header',
        category: 'header',
        content: null
      })
      console.log("Adicionado Header no início")
    }

    const lastBlock = emailStructure.blocks[emailStructure.blocks.length - 1]
    if (!lastBlock || lastBlock.name !== 'Signature') {
      emailStructure.blocks.push({
        name: 'Signature',
        category: 'content',
        content: null
      })
      console.log("Adicionada Signature no final")
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
