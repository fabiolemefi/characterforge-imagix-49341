import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log('Request body:', body);
    
    if (!body) {
      throw new Error('Request body is empty');
    }
    
    const { email } = JSON.parse(body);
    console.log('Verifying email in Jira:', email);
    
    if (!email) {
      throw new Error('Email is required');
    }

    const jiraApiToken = Deno.env.get('JIRA_API_TOKEN');
    if (!jiraApiToken) {
      throw new Error('JIRA_API_TOKEN not configured');
    }

    // Jira Cloud requires email:token in base64
    const jiraEmail = 'fabio.leme@sejaefi.com.br';
    const authString = btoa(`${jiraEmail}:${jiraApiToken}`);

    // Search for user in Jira using email directly
    // Try multiple search methods to find the user
    let users = [];
    
    // Method 1: Search by exact email
    const jiraUrl1 = `https://sejaefi.atlassian.net/rest/api/3/user/search?query=${encodeURIComponent(email)}&maxResults=50`;
    console.log('Trying Jira API URL (method 1):', jiraUrl1);
    
    let jiraResponse = await fetch(jiraUrl1, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    console.log('Jira response status (method 1):', jiraResponse.status);
    
    if (jiraResponse.ok) {
      const responseText = await jiraResponse.text();
      console.log('Jira raw response (method 1):', responseText);
      users = JSON.parse(responseText);
      console.log('Users found (method 1):', users.length);
    }
    
    // Method 2: If not found, try getting all users and filtering
    if (users.length === 0) {
      console.log('Trying method 2: Get all users');
      const jiraUrl2 = `https://sejaefi.atlassian.net/rest/api/3/users/search?maxResults=1000`;
      
      jiraResponse = await fetch(jiraUrl2, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json',
        },
      });
      
      console.log('Jira response status (method 2):', jiraResponse.status);
      
      if (jiraResponse.ok) {
        const responseText = await jiraResponse.text();
        const allUsers = JSON.parse(responseText);
        console.log('Total users in Jira:', allUsers.length);
        
        // Filter by email
        users = allUsers.filter((user: any) => 
          user.emailAddress?.toLowerCase() === email.toLowerCase()
        );
        console.log('Users found after filtering by email:', users.length);
      }
    }

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      console.error('Jira API error - Status:', jiraResponse.status);
      console.error('Jira API error - Body:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar Jira',
          details: errorText,
          status: jiraResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Email não encontrado no Jira' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jiraUser = users[0];
    
    return new Response(
      JSON.stringify({
        success: true,
        userData: {
          full_name: jiraUser.displayName,
          avatar_url: jiraUser.avatarUrls?.['48x48'] || jiraUser.avatarUrls?.['32x32'],
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-jira-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
