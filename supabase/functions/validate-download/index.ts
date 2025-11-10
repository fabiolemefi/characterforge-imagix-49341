import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para verificar senha usando Web Crypto API
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Hash é no formato: salt$hash
    const [salt, storedHash] = hash.split('$');
    
    // Criar hash da senha fornecida
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

interface ValidateRequest {
  share_code: string;
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { share_code, password }: ValidateRequest = await req.json();

    if (!share_code) {
      return new Response(
        JSON.stringify({ error: 'Share code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 [validate-download] Validating share code: ${share_code}`);

    // Buscar arquivo compartilhado
    const { data: file, error: fileError } = await supabase
      .from('shared_files')
      .select('*')
      .eq('share_code', share_code)
      .eq('is_active', true)
      .single();

    if (fileError || !file) {
      console.error('❌ [validate-download] File not found:', fileError);
      return new Response(
        JSON.stringify({ error: 'Link inválido ou expirado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      console.log('⏰ [validate-download] File expired');
      return new Response(
        JSON.stringify({ error: 'Este link expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar senha se necessário
    if (file.password_hash) {
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Senha necessária', requires_password: true }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValidPassword = await verifyPassword(password, file.password_hash);
      if (!isValidPassword) {
        console.log('🔐 [validate-download] Invalid password');
        return new Response(
          JSON.stringify({ error: 'Senha incorreta' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('✅ [validate-download] Validation successful, generating signed URL');

    // Incrementar contador de downloads
    await supabase
      .from('shared_files')
      .update({ download_count: file.download_count + 1 })
      .eq('id', file.id);

    // Gerar URL assinada válida por 5 minutos
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media-downloads')
      .createSignedUrl(file.file_path, 300);

    if (signedUrlError || !signedUrlData) {
      console.error('❌ [validate-download] Error generating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de download' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎉 [validate-download] Download URL generated successfully');

    return new Response(
      JSON.stringify({
        download_url: signedUrlData.signedUrl,
        file_name: file.file_name,
        file_size: file.file_size,
        file_type: file.file_type,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ [validate-download] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
