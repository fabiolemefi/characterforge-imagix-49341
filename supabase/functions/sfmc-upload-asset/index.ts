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

async function uploadAsset(assetData: UploadAssetRequest) {
  const proxyUrl = 'https://proxyaccess.free.nf/sfmc';

  console.log('Uploading asset via PHP proxy:', assetData.name);

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assetData),
  });

  const responseText = await response.text();
  console.log('PHP Proxy Response:', response.status, responseText);

  if (!response.ok) {
    // 400 pode significar que o asset já existe
    if (response.status === 400) {
      return {
        success: false,
        status: 400,
        message: 'Asset já existe ou dados inválidos',
        details: responseText,
      };
    }
    throw new Error(`Failed to upload asset via proxy: ${response.status} - ${responseText}`);
  }

  return {
    success: true,
    data: JSON.parse(responseText),
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const assetData: UploadAssetRequest = await req.json();

    console.log('Processing upload request for:', assetData.name);

    const result = await uploadAsset(assetData);

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
