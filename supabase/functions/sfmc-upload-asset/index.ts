import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadAssetRequest {
  assetType: {
    name: string;
    id: number;
  };
  name: string;
  file: string; // base64
  category?: {
    id: number;
  };
  customerKey?: string;
  fileProperties?: {
    fileName: string;
    extension: string;
  };
  views?: {
    html?: {
      content: string;
    };
    subjectline?: {
      content: string;
    };
    preheader?: {
      content: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const assetData: UploadAssetRequest = await req.json();

    console.log('Processing upload request for:', assetData.name);

    // Forward to PHP proxy
    const response = await fetch('https://proxyaccess.free.nf/sfmc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy Error:', response.status, errorText);
      throw new Error(`Proxy error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in sfmc-upload-asset function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
