import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SFMCTokenResponse {
  access_token: string;
  expires_in: number;
}

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

async function getSFMCToken(): Promise<string> {
  const authBaseUri = Deno.env.get('SFMC_AUTH_BASE_URI');
  const clientId = Deno.env.get('SFMC_CLIENT_ID');
  const clientSecret = Deno.env.get('SFMC_CLIENT_SECRET');
  
  console.log('Auth Base URI:', authBaseUri);
  console.log('Client ID configured:', !!clientId);
  console.log('Client Secret configured:', !!clientSecret);
  
  if (!authBaseUri || !clientId || !clientSecret) {
    throw new Error('SFMC credentials not configured');
  }
  
  // Remove trailing slash if present
  const baseUri = authBaseUri.replace(/\/$/, '');
  const authUrl = `${baseUri}/v2/token`;
  
  console.log('Attempting authentication at:', authUrl);
  
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('SFMC Auth Error:', error);
    console.error('Response status:', response.status);
    throw new Error(`Failed to authenticate with SFMC: ${response.status}`);
  }

  const data: SFMCTokenResponse = await response.json();
  console.log('Authentication successful');
  return data.access_token;
}

async function uploadAsset(token: string, assetData: UploadAssetRequest) {
  const subdomain = Deno.env.get('SFMC_SUBDOMAIN');
  const uploadUrl = `https://${subdomain}.rest.marketingcloudapis.com/asset/v1/content/assets`;

  console.log('Uploading asset:', assetData.name);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assetData),
  });

  const responseText = await response.text();
  console.log('SFMC Response:', response.status, responseText);

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
    throw new Error(`Failed to upload asset: ${response.status} - ${responseText}`);
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

    const token = await getSFMCToken();
    const result = await uploadAsset(token, assetData);

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
