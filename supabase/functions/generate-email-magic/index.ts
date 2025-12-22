import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
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
      console.error('❌ [Email Magic] REPLICATE_API_KEY is not set')
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { prompt, stream: useStream } = await req.json()

    if (!prompt) {
      console.error('❌ [Email Magic] Prompt is required')
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('📧 [Email Magic] Starting generation with prompt length:', prompt.length)
    console.log('📧 [Email Magic] Streaming enabled:', useStream)

    // Fetch configuration from database
    const { data: config, error: configError } = await supabase
      .from('email_magic_config')
      .select('*')
      .limit(1)
      .single()

    if (configError) {
      console.error('❌ [Email Magic] Error fetching config:', configError)
      throw new Error('Failed to fetch configuration')
    }

    console.log('✅ [Email Magic] Config loaded:', {
      imagesCount: config.reference_images?.length || 0,
      temperature: config.temperature,
      thinking_level: config.thinking_level
    })

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    // Build input for Replicate
    const input: Record<string, any> = {
      prompt: prompt,
      system_instruction: config.system_instruction || '',
      top_p: parseFloat(config.top_p) || 0.95,
      temperature: parseFloat(config.temperature) || 1.5,
      thinking_level: config.thinking_level || 'high',
      max_output_tokens: config.max_output_tokens || 65535,
      videos: []
    }

    // Add reference images if available
    if (config.reference_images && config.reference_images.length > 0) {
      input.images = config.reference_images
    }

    console.log('🚀 [Email Magic] Calling Replicate with model: google/gemini-3-pro')
    console.log('🚀 [Email Magic] Input params:', JSON.stringify({
      ...input,
      prompt: input.prompt.substring(0, 100) + '...',
      system_instruction: input.system_instruction.substring(0, 100) + '...'
    }))

    // Use streaming for progressive response
    if (useStream) {
      console.log('🌊 [Email Magic] Using streaming mode')
      
      const stream = await replicate.stream("google/gemini-3-pro", { input })
      
      // Create a readable stream to send to the client
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              const chunk = typeof event === 'string' ? event : JSON.stringify(event)
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            console.log('✅ [Email Magic] Stream completed')
          } catch (streamError) {
            console.error('❌ [Email Magic] Stream error:', streamError)
            controller.error(streamError)
          }
        }
      })

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // Non-streaming mode (fallback)
    console.log('📦 [Email Magic] Using non-streaming mode')
    const startTime = Date.now()
    
    const output = await replicate.run("google/gemini-3-pro", { input })
    
    const duration = Date.now() - startTime
    console.log(`✅ [Email Magic] Replicate response received in ${duration}ms`)

    // Output is an array of strings that need to be concatenated
    let htmlContent = ''
    if (Array.isArray(output)) {
      htmlContent = output.join('')
    } else if (typeof output === 'string') {
      htmlContent = output
    } else {
      console.error('❌ [Email Magic] Unexpected output format:', typeof output)
      throw new Error('Unexpected response format from Replicate')
    }

    // Clean up the HTML if needed (remove markdown code blocks if present)
    htmlContent = htmlContent
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    console.log('✅ [Email Magic] HTML generated, length:', htmlContent.length)

    return new Response(
      JSON.stringify({ html: htmlContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [Email Magic] Error:', errorMessage);
    console.error('❌ [Email Magic] Full error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
