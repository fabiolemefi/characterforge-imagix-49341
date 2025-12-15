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

    const { integrationId, startDate, endDate, comparisonStartDate, comparisonEndDate } = await req.json();

    if (!integrationId) {
      throw new Error('integrationId is required');
    }

    console.log(`Fetching widgets for integration ${integrationId}`);
    console.log(`Period: ${startDate} to ${endDate}`);

    // Step 1: Get available widgets for this integration
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
      console.log('No widgets found');
      return new Response(JSON.stringify({ metrics: [], widgets: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${widgets.length} widgets, fetching values...`);

    // Step 2: Request widget values with FULL widget objects
    const requestBody = {
      start: startDate,
      end: endDate,
      comparison_start: comparisonStartDate || null,
      comparison_end: comparisonEndDate || null,
      widgets: widgets.slice(0, 15), // Send full widget objects, not just IDs
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const valuesResponse = await fetch(
      `https://app.reportei.com/api/v1/integrations/${integrationId}/widgets/value`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const contentType = valuesResponse.headers.get('content-type') || '';
    
    if (!valuesResponse.ok || !contentType.includes('application/json')) {
      const errorText = await valuesResponse.text();
      console.error('Values API error:', valuesResponse.status, errorText.substring(0, 500));
      
      // Fallback: return widget metadata without values
      const metrics = widgets.slice(0, 15).map((widget: any) => ({
        id: widget.id,
        name: widget.references?.title || widget.name || 'Métrica',
        description: widget.references?.description,
        type: widget.component,
        value: null,
      }));

      return new Response(JSON.stringify({ 
        metrics,
        widgets: widgets.slice(0, 15),
        message: `Não foi possível obter valores: ${valuesResponse.status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const valuesData = await valuesResponse.json();
    console.log('Values response:', JSON.stringify(valuesData, null, 2).substring(0, 1000));

    // Process response - extract metrics with values
    const responseWidgets = valuesData.widgets || valuesData.data || valuesData || [];
    
    const metrics = responseWidgets.map((widget: any) => ({
      id: widget.id,
      name: widget.references?.title || widget.name || 'Métrica',
      description: widget.references?.description,
      type: widget.component,
      value: widget.value || widget.data || null,
      comparison: widget.comparison || null,
    }));

    console.log(`Returning ${metrics.length} metrics with values`);

    return new Response(JSON.stringify({ 
      metrics,
      widgets: responseWidgets,
      raw: valuesData,
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