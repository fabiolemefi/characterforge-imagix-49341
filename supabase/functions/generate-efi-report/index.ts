import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    console.log("[generate-efi-report] Request body keys:", Object.keys(body))

    // If it's a status check request
    if (body.predictionId) {
      console.log("[generate-efi-report] Checking status for prediction:", body.predictionId)
      const prediction = await replicate.predictions.get(body.predictionId)
      console.log("[generate-efi-report] Status:", prediction.status)
      
      let imageUrl = null
      if (prediction.output) {
        if (typeof prediction.output === "string") {
          imageUrl = prediction.output
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          imageUrl = prediction.output[0]
        }
      }
      
      return new Response(JSON.stringify({
        status: prediction.status,
        imageUrl: imageUrl,
        error: prediction.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If it's a generation request
    if (!body.reportData) {
      return new Response(
        JSON.stringify({ error: "Missing required field: reportData" }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Load config from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: config, error: configError } = await supabase
      .from('efi_report_config')
      .select('*')
      .limit(1)
      .single()

    if (configError) {
      console.error("[generate-efi-report] Error loading config:", configError)
      throw new Error('Failed to load configuration')
    }

    console.log("[generate-efi-report] Loaded config, starting analysis...")

    // Step 1: Format data for design (without insights)
    console.log("[generate-efi-report] Step 1: Formatting data for infographic...")
    const dataFormattingPrompt = `${config.data_formatting_prompt || config.analysis_prompt}\n\nDados:\n${body.reportData}`
    
    const dataResponse = await replicate.run("openai/gpt-5-nano", {
      input: {
        prompt: dataFormattingPrompt,
        messages: [],
        verbosity: "medium",
        image_input: [],
        reasoning_effort: "minimal"
      }
    })

    // Handle response format
    let dataForDesign = ''
    if (Array.isArray(dataResponse)) {
      dataForDesign = dataResponse.join('')
    } else if (typeof dataResponse === 'string') {
      dataForDesign = dataResponse
    } else {
      dataForDesign = JSON.stringify(dataResponse)
    }

    console.log("[generate-efi-report] Data formatting complete, length:", dataForDesign.length)

    // Step 2: Generate recommendations separately
    console.log("[generate-efi-report] Step 2: Generating recommendations...")
    const recommendationsPrompt = `${config.recommendations_prompt || 'Gere recomendações estratégicas e insights acionáveis baseados nos dados abaixo. Formate em markdown.'}\n\nDados:\n${body.reportData}`
    
    const recommendationsResponse = await replicate.run("openai/gpt-5-nano", {
      input: {
        prompt: recommendationsPrompt,
        messages: [],
        verbosity: "medium",
        image_input: [],
        reasoning_effort: "medium"
      }
    })

    let recommendations = ''
    if (Array.isArray(recommendationsResponse)) {
      recommendations = recommendationsResponse.join('')
    } else if (typeof recommendationsResponse === 'string') {
      recommendations = recommendationsResponse
    } else {
      recommendations = JSON.stringify(recommendationsResponse)
    }

    console.log("[generate-efi-report] Recommendations complete, length:", recommendations.length)

    // Step 3: Generate infographic with nano-banana-pro (async - return prediction_id)
    const colorsArray = Array.isArray(config.colors) 
      ? config.colors 
      : JSON.parse(config.colors)
    const colorsStr = colorsArray.join(', ')
    
    // Build design prompt with formatted data (not recommendations)
    let designPrompt = config.design_prompt
    if (designPrompt.includes('{analysis}')) {
      designPrompt = designPrompt.replace('{analysis}', dataForDesign)
    } else {
      designPrompt = `${designPrompt}\n\nDados formatados:\n${dataForDesign}`
    }
    designPrompt = `${designPrompt}\n\nCores: ${colorsStr}`

    console.log("[generate-efi-report] Creating prediction with nano-banana-pro...")

    const prediction = await replicate.predictions.create({
      model: "google/nano-banana-pro",
      input: {
        prompt: designPrompt,
        resolution: config.resolution || "2K",
        aspect_ratio: config.aspect_ratio || "3:4",
        output_format: "png",
        safety_filter_level: "block_only_high",
        image_input: config.logo_url ? [config.logo_url] : []
      }
    })

    console.log("[generate-efi-report] Prediction created:", prediction.id, "Status:", prediction.status)

    return new Response(JSON.stringify({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
      recommendations: recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("[generate-efi-report] Error:", errorMessage)
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
