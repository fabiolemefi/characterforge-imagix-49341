import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Ad {
  id: string;
  name: string;
  cost: number;
  interactions: number;
  platform: 'meta' | 'google';
  integrationId: string;
  projectName: string;
  campaignName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPORTEI_API_KEY = Deno.env.get('REPORTEI_API_KEY');
    if (!REPORTEI_API_KEY) {
      throw new Error('REPORTEI_API_KEY not configured');
    }

    const { platform = 'all' } = await req.json().catch(() => ({}));
    console.log(`Fetching ads for platform: ${platform}`);

    const REPORTEI_API_URL = 'https://app.reportei.com/api/v1';
    
    // Fetch all clients
    const clientsResponse = await fetch(`${REPORTEI_API_URL}/clients`, {
      headers: { 
        'Authorization': `Bearer ${REPORTEI_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    
    if (!clientsResponse.ok) {
      throw new Error(`Failed to fetch clients: ${clientsResponse.status}`);
    }

    const clientsData = await clientsResponse.json();
    const clients = clientsData.data || [];
    console.log(`Found ${clients.length} clients`);

    const allAds: Ad[] = [];

    // For each client, get integrations and fetch ads
    for (const client of clients) {
      const integrationsResponse = await fetch(
        `${REPORTEI_API_URL}/clients/${client.id}/integrations`,
        { 
          headers: { 
            'Authorization': `Bearer ${REPORTEI_API_KEY}`,
            'Accept': 'application/json',
          } 
        }
      );

      if (!integrationsResponse.ok) continue;

      const integrationsData = await integrationsResponse.json();
      const integrations = integrationsData.data || [];

      for (const integration of integrations) {
        const integrationName = integration.integration_name?.toLowerCase() || '';
        const isMeta = integrationName.includes('meta ads') || integrationName.includes('facebook ads');
        const isGoogle = integrationName.includes('google ads') && !integrationName.includes('analytics');

        if (!isMeta && !isGoogle) continue;
        if (platform === 'meta' && !isMeta) continue;
        if (platform === 'google' && !isGoogle) continue;

        const platformType = isMeta ? 'meta' : 'google';
        const widgetReferenceKey = isMeta ? 'fb_ads:ads' : 'gads:ads_summary_table';

        console.log(`Fetching ads for ${client.name} - ${integration.integration_name} (${platformType})`);

        // Get widgets for this integration (v1 API)
        const widgetsResponse = await fetch(
          `${REPORTEI_API_URL}/integrations/${integration.id}/widgets`,
          { 
            headers: { 
              'Authorization': `Bearer ${REPORTEI_API_KEY}`,
              'Accept': 'application/json',
            } 
          }
        );

        if (!widgetsResponse.ok) {
          console.log(`Failed to fetch widgets: ${widgetsResponse.status}`);
          continue;
        }

        const widgetsData = await widgetsResponse.json();
        const widgets = widgetsData.data || [];
        console.log(`Found ${widgets.length} widgets for integration ${integration.id}`);

        // Find the ads datatable widget
        const adsWidget = widgets.find((w: any) => w.reference_key === widgetReferenceKey);
        if (!adsWidget) {
          console.log(`Widget ${widgetReferenceKey} not found for integration ${integration.id}`);
          continue;
        }

        console.log(`Found ads widget: ${adsWidget.reference_key} (id: ${adsWidget.id})`);

        // Calculate date range (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // Fetch values for the ads widget (v1 API with correct format)
        const valuesResponse = await fetch(
          `${REPORTEI_API_URL}/integrations/${integration.id}/widgets/value`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${REPORTEI_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              start: formatDate(startDate),
              end: formatDate(endDate),
              comparison_start: null,
              comparison_end: null,
              widgets: [adsWidget],
            }),
          }
        );

        if (!valuesResponse.ok) {
          console.log(`Failed to fetch values: ${valuesResponse.status}`);
          continue;
        }

        const valuesData = await valuesResponse.json();
        const widgetData = valuesData.data?.[adsWidget.id];

        if (!widgetData?.values) {
          console.log(`No values for widget ${adsWidget.id}`);
          continue;
        }

        // Parse datatable values
        const labels = widgetData.labels || [];
        const values = widgetData.values || [];

        // Find column indices
        const nameIndex = isMeta 
          ? labels.indexOf('ad_name') !== -1 ? labels.indexOf('ad_name') : 0
          : labels.indexOf('ad_group_ad.ad.name') !== -1 ? labels.indexOf('ad_group_ad.ad.name') : 0;
        
        const costIndex = isMeta
          ? labels.indexOf('spend')
          : labels.indexOf('metrics.cost_micros');
        
        const interactionsIndex = isMeta
          ? labels.indexOf('clicks')
          : labels.indexOf('metrics.interactions');

        const campaignIndex = isMeta
          ? labels.indexOf('campaign_name')
          : labels.indexOf('campaign.name');

        // Process each row
        for (let i = 0; i < values.length; i++) {
          const row = values[i]?.data || values[i];
          if (!row || !Array.isArray(row)) continue;

          // Handle name field - API returns object {id, text, image} for Meta or {text} for Google
          const adNameRaw = row[nameIndex];
          const adName = typeof adNameRaw === 'object' && adNameRaw !== null
            ? (adNameRaw.text || `Anúncio ${i + 1}`)
            : (adNameRaw || `Anúncio ${i + 1}`);
          
          let cost = parseFloat(row[costIndex]) || 0;
          const interactions = parseInt(row[interactionsIndex]) || 0;
          
          // Handle campaign field - may also be an object
          const campaignRaw = row[campaignIndex];
          const campaignName = typeof campaignRaw === 'object' && campaignRaw !== null
            ? (campaignRaw.text || '')
            : (campaignRaw || '');

          // Google returns cost in micros (divide by 1,000,000)
          if (!isMeta && cost > 1000) {
            cost = cost / 1000000;
          }

          allAds.push({
            id: `${integration.id}-${i}`,
            name: adName,
            cost,
            interactions,
            platform: platformType,
            integrationId: integration.id,
            projectName: client.name,
            campaignName,
          });
        }
      }
    }

    console.log(`Returning ${allAds.length} ads`);

    return new Response(JSON.stringify({ 
      ads: allAds,
      total: allAds.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
