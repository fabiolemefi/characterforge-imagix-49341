import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REPORTEI_API_URL = 'https://app.reportei.com/api/v1';

interface ReporteiClient {
  id: number;
  name: string;
  slug: string;
  avatar: string | null;
}

interface ReporteiIntegration {
  id: string;
  integration_id: string;
  source_name: string;
  integration_name: string;
  extra_info: Record<string, unknown> | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('REPORTEI_API_KEY');
    
    if (!apiKey) {
      console.error('REPORTEI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching clients from Reportei API...');

    // Fetch all clients (projects)
    const clientsResponse = await fetch(`${REPORTEI_API_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      console.error('Error fetching clients:', clientsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch clients: ${clientsResponse.status}` }),
        { status: clientsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientsData = await clientsResponse.json();
    const clients: ReporteiClient[] = clientsData.data || [];
    
    console.log(`Found ${clients.length} clients`);

    // Fetch integrations for each client
    const projectsWithIntegrations = await Promise.all(
      clients.map(async (client) => {
        try {
          const integrationsResponse = await fetch(
            `${REPORTEI_API_URL}/clients/${client.id}/integrations`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
              },
            }
          );

          if (!integrationsResponse.ok) {
            console.error(`Error fetching integrations for client ${client.id}:`, integrationsResponse.status);
            return {
              id: client.id,
              name: client.name,
              slug: client.slug,
              avatar: client.avatar,
              integrations: [],
            };
          }

          const integrationsData = await integrationsResponse.json();
          const integrations: ReporteiIntegration[] = integrationsData.data || [];
          
          // Filter only Google Ads integrations
          const googleAdsIntegrations = integrations.filter(
            (integration) => integration.integration_name?.toLowerCase().includes('google ads')
          );

          return {
            id: client.id,
            name: client.name,
            slug: client.slug,
            avatar: client.avatar,
            integrations: googleAdsIntegrations.map((integration) => ({
              id: integration.id,
              integration_id: integration.integration_id,
              source_name: integration.source_name,
              integration_name: integration.integration_name,
            })),
          };
        } catch (error) {
          console.error(`Error processing client ${client.id}:`, error);
          return {
            id: client.id,
            name: client.name,
            slug: client.slug,
            avatar: client.avatar,
            integrations: [],
          };
        }
      })
    );

    // Filter only projects that have Google Ads integrations
    const projectsWithGoogleAds = projectsWithIntegrations.filter(
      (project) => project.integrations.length > 0
    );

    console.log(`Found ${projectsWithGoogleAds.length} projects with Google Ads integrations`);

    return new Response(
      JSON.stringify({ 
        projects: projectsWithGoogleAds,
        total: projectsWithGoogleAds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in list-reportei-projects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
