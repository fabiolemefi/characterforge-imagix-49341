import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('REPORTEI_API_KEY');
    if (!apiKey) {
      throw new Error('REPORTEI_API_KEY not configured');
    }

    const { integrationId } = await req.json();

    if (!integrationId) {
      throw new Error('integrationId is required');
    }

    console.log(`Fetching widgets for integration ${integrationId}`);

    // Get available widgets for this integration
    const widgetsResponse = await fetch(
      `https://app.reportei.com/api/v1/integrations/${integrationId}/widgets`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!widgetsResponse.ok) {
      const errorText = await widgetsResponse.text();
      console.error('Widgets API error:', errorText);
      throw new Error(`Failed to fetch widgets: ${widgetsResponse.status}`);
    }

    const widgetsData = await widgetsResponse.json();
    const widgets = widgetsData.data || widgetsData.widgets || widgetsData || [];
    
    if (!Array.isArray(widgets) || widgets.length === 0) {
      return new Response(JSON.stringify({ metrics: [], widgets: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract summary widget which typically contains key metrics
    const summaryWidget = widgets.find((w: any) => 
      w.container_type === 'summary' || w.reference_key?.includes('summary')
    );

    // Build metrics from widget metadata (references contain titles)
    const metrics = widgets.slice(0, 15).map((widget: any) => ({
      id: widget.id,
      name: widget.references?.title || widget.name || 'Métrica',
      description: widget.references?.description,
      type: widget.component,
      value: null, // Values would require report generation
    }));

    console.log(`Found ${metrics.length} widgets`);

    return new Response(JSON.stringify({ 
      metrics,
      widgets: widgets.slice(0, 15),
      message: 'Widget metadata loaded. Full metric values require report generation.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
