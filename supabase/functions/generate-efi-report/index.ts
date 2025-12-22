import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    const body = await req.json()
    const { reportData } = body

    if (!reportData) {
      return new Response(
        JSON.stringify({ error: "Missing required field: reportData is required" }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log("[generate-efi-report] Starting report generation...")
    console.log("[generate-efi-report] Report data length:", reportData.length)

    // Step 1: Analyze data with GPT-5-nano
    console.log("[generate-efi-report] Step 1: Analyzing data with GPT-5-nano...")
    
    const analysisPrompt = `Analise os dados abaixo e formate-os de forma clara para um infográfico. 
Adicione insights e análises que ajudem diretores e pessoas não-técnicas a entender se os números são bons ou ruins. 
Seja objetivo e destaque os pontos principais. Formate a resposta de forma estruturada com títulos, subtítulos e bullet points quando necessário.

Dados do relatório:
${reportData}`

    const analysisOutput = await replicate.run("openai/gpt-5-nano", {
      input: {
        prompt: analysisPrompt,
        messages: [],
        verbosity: "medium",
        image_input: [],
        reasoning_effort: "minimal"
      }
    })

    console.log("[generate-efi-report] Analysis output type:", typeof analysisOutput)
    
    // Handle different response formats
    let analysisResult = ""
    if (typeof analysisOutput === "string") {
      analysisResult = analysisOutput
    } else if (Array.isArray(analysisOutput)) {
      analysisResult = analysisOutput.join("")
    } else if (analysisOutput && typeof analysisOutput === "object") {
      analysisResult = JSON.stringify(analysisOutput)
    }

    console.log("[generate-efi-report] Analysis result length:", analysisResult.length)
    console.log("[generate-efi-report] Analysis preview:", analysisResult.substring(0, 200))

    // Step 2: Generate infographic with nano-banana-pro
    console.log("[generate-efi-report] Step 2: Generating infographic with nano-banana-pro...")

    const designPrompt = `Crie uma imagem de infografico para demonstrar esses dados abaixo. 
Ele deve utilizar as cores #f37021, #00809d, #f83a36, #57a73b, #f39c12, #f6f8fc, #e8f0f8, #a4acbc, #1d1d1d 
e NUNCA escreve-las no design. Utilize negrito nos textos para reforçar infos ou dados importantes.

Utilize no header o logo do Efi Bank na esquerda (não altere o logo em anexo, mantenha ele exatamente como é) 
e o titulo na direita (faça o titulo caber sem quebra de linha com a cor #1d1d1d). Use a fonte Red Hat.

${analysisResult}`

    const imageOutput = await replicate.run("google/nano-banana-pro", {
      input: {
        prompt: designPrompt,
        resolution: "2K",
        aspect_ratio: "3:4",
        output_format: "png",
        safety_filter_level: "block_only_high",
        image_input: [
          "https://replicate.delivery/pbxt/OHJbCODJ07JTsXbAhr10gX6xEdLGuFoWx9z1JlVOKAwK6Ecr/logo-efi-1024.png"
        ]
      }
    })

    console.log("[generate-efi-report] Image output type:", typeof imageOutput)
    console.log("[generate-efi-report] Image output:", imageOutput)

    // Handle different response formats for image
    let imageUrl = ""
    if (typeof imageOutput === "string") {
      imageUrl = imageOutput
    } else if (Array.isArray(imageOutput) && imageOutput.length > 0) {
      imageUrl = imageOutput[0]
    } else if (imageOutput && typeof imageOutput === "object" && imageOutput.output) {
      imageUrl = Array.isArray(imageOutput.output) ? imageOutput.output[0] : imageOutput.output
    }

    if (!imageUrl) {
      throw new Error("Failed to generate image - no URL returned")
    }

    console.log("[generate-efi-report] Generated image URL:", imageUrl)

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        analysis: analysisResult 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("[generate-efi-report] Error:", errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
