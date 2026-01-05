import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JIRA_BASE_URL = "https://efibankmarketing.atlassian.net";
const JIRA_PROJECT_KEY = "MAR";

interface CreateEpicRequest {
  name: string;
  description?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JIRA_USER_EMAIL = Deno.env.get("JIRA_USER_EMAIL");
    const JIRA_API_TOKEN = Deno.env.get("JIRA_API_TOKEN");
    
    if (!JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
      console.error("Missing Jira credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Jira credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jiraHeaders = {
      Authorization: `Basic ${btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const body: CreateEpicRequest = await req.json();
    const { name, description } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: "Nome do OKR é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating Jira Epic: ${name}`);

    // Build description in Atlassian Document Format (ADF)
    const adfDescription = description ? {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: description
            }
          ]
        }
      ]
    } : undefined;

    // Create Epic in Jira
    const epicPayload: Record<string, unknown> = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: name,
        issuetype: { name: "Epic" },
      }
    };

    if (adfDescription) {
      epicPayload.fields = {
        ...(epicPayload.fields as Record<string, unknown>),
        description: adfDescription
      };
    }

    console.log("Sending request to Jira:", JSON.stringify(epicPayload));

    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: "POST",
      headers: jiraHeaders,
      body: JSON.stringify(epicPayload),
    });

    const responseText = await response.text();
    console.log(`Jira response status: ${response.status}`);
    console.log(`Jira response: ${responseText}`);

    if (!response.ok) {
      console.error("Failed to create Jira Epic:", responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao criar épico no Jira: ${response.status}`,
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jiraResponse = JSON.parse(responseText);
    const epicKey = jiraResponse.key;

    console.log(`Successfully created Jira Epic: ${epicKey}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        epic_key: epicKey,
        epic_id: jiraResponse.id,
        epic_url: `${JIRA_BASE_URL}/browse/${epicKey}`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating Jira Epic:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
