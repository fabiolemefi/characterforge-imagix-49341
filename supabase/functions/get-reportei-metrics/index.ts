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

    console.log(`Fetching metrics for integration ${integrationId}`);
    console.log(`Period: ${startDate} to ${endDate}`);

    // First, get available widgets for this integration
    const widgetsResponse = await fetch(
      `https://app.reportei.com/api/v1/integrations/${integrationId}/widgets`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!widgetsResponse.ok) {
      const errorText = await widgetsResponse.text();
      console.error('Widgets API error:', errorText);
      throw new Error(`Failed to fetch widgets: ${widgetsResponse.status}`);
    }

    const widgetsData = await widgetsResponse.json();
    console.log('Available widgets:', JSON.stringify(widgetsData).substring(0, 500));

    // Extract widget IDs - assuming the response has a widgets array
    const widgets = widgetsData.data || widgetsData.widgets || widgetsData || [];
    
    if (!Array.isArray(widgets) || widgets.length === 0) {
      console.log('No widgets found for this integration');
      return new Response(JSON.stringify({ metrics: [], widgets: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get widget IDs for the values request
    const widgetIds = widgets.map((w: any) => w.id || w.widget_id || w);

    console.log('Widget IDs to fetch:', widgetIds);

    // Now fetch the values for these widgets
    const valuesResponse = await fetch(
      `https://app.reportei.com/api/v1/integrations/${integrationId}/widgets/value`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startDate,
          end: endDate,
          comparison_start: comparisonStartDate,
          comparison_end: comparisonEndDate,
          widgets: widgetIds,
        }),
      }
    );

    if (!valuesResponse.ok) {
      const errorText = await valuesResponse.text();
      console.error('Values API error:', errorText);
      throw new Error(`Failed to fetch values: ${valuesResponse.status}`);
    }

    const valuesData = await valuesResponse.json();
    console.log('Metrics values:', JSON.stringify(valuesData).substring(0, 1000));

    // Combine widget metadata with values
    const metricsWithValues = widgets.map((widget: any) => {
      const widgetId = widget.id || widget.widget_id;
      const value = valuesData.data?.[widgetId] || valuesData[widgetId] || null;
      return {
        id: widgetId,
        name: widget.name || widget.label || widgetId,
        description: widget.description,
        type: widget.type,
        value: value,
      };
    });

    return new Response(JSON.stringify({ 
      metrics: metricsWithValues,
      widgets: widgets,
      raw: valuesData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-reportei-metrics:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

