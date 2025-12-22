import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a deterministic password using SHA-256 (max 64 chars, within bcrypt's 72 char limit)
async function generateDerivedPassword(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email.toLowerCase()}:${secret}:jira-auth-v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jiraToken = Deno.env.get('JIRA_API_TOKEN');
    const loginSecret = Deno.env.get('JIRA_LOGIN_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!jiraToken || !loginSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create proper Jira auth string (email:apiToken in base64)
    const jiraAdminEmail = 'fabio.leme@sejaefi.com.br';
    const authString = btoa(`${jiraAdminEmail}:${jiraToken}`);

    // 1. Verify user in Jira
    console.log(`Verifying Jira user: ${email}`);
    
    let jiraUser = null;
    
    // Method 1: Search by email directly
    const searchUrl = `https://sejaefi.atlassian.net/rest/api/3/user/search?query=${encodeURIComponent(email)}`;
    const jiraResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    if (jiraResponse.ok) {
      const users = await jiraResponse.json();
      jiraUser = users.find((u: any) => 
        u.emailAddress?.toLowerCase() === email.toLowerCase()
      );
    } else {
      console.log(`Jira search failed with status: ${jiraResponse.status}`);
    }

    // Method 2: If not found, try fetching all users
    if (!jiraUser) {
      console.log('User not found with direct search, trying bulk fetch...');
      const bulkUrl = 'https://sejaefi.atlassian.net/rest/api/3/users/search?maxResults=1000';
      const bulkResponse = await fetch(bulkUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
        },
      });

      if (bulkResponse.ok) {
        const allUsers = await bulkResponse.json();
        jiraUser = allUsers.find((u: any) => 
          u.emailAddress?.toLowerCase() === email.toLowerCase()
        );
      }
    }

    if (!jiraUser) {
      console.log(`User not found in Jira: ${email}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Email não encontrado no Jira da empresa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Jira user found: ${jiraUser.displayName}`);

    // 2. Generate derived password using SHA-256 (64 chars, within 72 char limit)
    const derivedPassword = await generateDerivedPassword(email, loginSecret);
    console.log(`Generated derived password length: ${derivedPassword.length}`);

    // 3. Initialize Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 4. Check if user exists in Supabase
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (!existingProfile) {
      console.log(`Creating new user in Supabase: ${email}`);
      
      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: derivedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: jiraUser.displayName,
          avatar_url: jiraUser.avatarUrls?.['48x48'] || null
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`User created successfully: ${newUser.user?.id}`);

      // Update profile with Jira data
      if (newUser.user) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: jiraUser.displayName,
            avatar_url: jiraUser.avatarUrls?.['48x48'] || null
          })
          .eq('id', newUser.user.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }
      }
    } else {
      console.log(`User already exists: ${email}`);
      
      // Update password to ensure it matches derived password
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        existingProfile.id,
        { password: derivedPassword }
      );
      
      if (passwordError) {
        console.error('Error updating password:', passwordError);
      } else {
        console.log('Password updated to derived password');
      }
      
      // Update profile with latest Jira data
      await supabaseAdmin
        .from('profiles')
        .update({
          full_name: jiraUser.displayName,
          avatar_url: jiraUser.avatarUrls?.['48x48'] || null
        })
        .eq('id', existingProfile.id);
    }

    // 5. Return success with derived password for frontend login
    return new Response(
      JSON.stringify({
        success: true,
        derivedPassword,
        userData: {
          full_name: jiraUser.displayName,
          avatar_url: jiraUser.avatarUrls?.['48x48'] || null
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in jira-login:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
