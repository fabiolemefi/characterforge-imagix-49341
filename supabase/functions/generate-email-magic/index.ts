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
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { prompt } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('📧 [Email Magic] Starting MJML generation with prompt length:', prompt.length)

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

    const output = await replicate.run("google/gemini-3-pro", { input })

    console.log('✅ [Email Magic] Replicate response received')

    // Output is an array of strings that need to be concatenated
    let mjmlContent = ''
    if (Array.isArray(output)) {
      mjmlContent = output.join('')
    } else if (typeof output === 'string') {
      mjmlContent = output
    } else {
      console.error('❌ [Email Magic] Unexpected output format:', typeof output)
      throw new Error('Unexpected response format from Replicate')
    }

    // Clean up the MJML if needed (remove markdown code blocks if present)
    mjmlContent = mjmlContent
      .replace(/^```mjml?\n?/i, '')
      .replace(/^```xml?\n?/i, '')
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    console.log('✅ [Email Magic] MJML generated, length:', mjmlContent.length)

    return new Response(
      JSON.stringify({ mjml: mjmlContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ [Email Magic] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
