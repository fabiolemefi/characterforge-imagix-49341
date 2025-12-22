import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UploadAssetRequest {
  assetType: { name: string; id: number };
  name: string;
  file?: string; // base64
  category?: { id: number };
  customerKey?: string;
  fileProperties?: { fileName: string; extension: string };
  views?: {
    html?: { content: string };
    subjectline?: { content: string };
    preheader?: { content: string };
  };
}

interface SfmcAuthResponse {
  access_token: string;
  rest_instance_url: string;
  token_type: string;
  expires_in: number;
}

async function getSfmcAccessToken(): Promise<{ accessToken: string; restInstanceUrl: string }> {
  const authBaseUri = Deno.env.get("SFMC_AUTH_BASE_URI");
  const clientId = Deno.env.get("SFMC_CLIENT_ID");
  const clientSecret = Deno.env.get("SFMC_CLIENT_SECRET");

  if (!authBaseUri || !clientId || !clientSecret) {
    throw new Error("Missing SFMC credentials (AUTH_BASE_URI, CLIENT_ID, or CLIENT_SECRET)");
  }

  const authUrl = `${authBaseUri}/v2/token`;
  console.log("Authenticating with SFMC at:", authUrl);

  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SFMC Auth Error:", response.status, errorText);
    throw new Error(`SFMC authentication failed: ${response.status} - ${errorText}`);
  }

  const data: SfmcAuthResponse = await response.json();
  console.log("SFMC Auth successful, token expires in:", data.expires_in, "seconds");

  return {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,
  };
}

async function uploadAssetToSfmc(
  accessToken: string,
  restInstanceUrl: string,
  assetData: UploadAssetRequest
): Promise<any> {
  // Ensure restInstanceUrl ends with /
  const baseUrl = restInstanceUrl.endsWith('/') ? restInstanceUrl : `${restInstanceUrl}/`;
  const url = `${baseUrl}asset/v1/content/assets`;
  
  console.log("Uploading asset to SFMC:", url);
  console.log("Asset name:", assetData.name);
  console.log("Asset type:", assetData.assetType?.name);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assetData),
  });

  const responseText = await response.text();
  console.log("SFMC Upload Response Status:", response.status);
  console.log("SFMC Upload Response:", responseText.substring(0, 500));

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response from SFMC: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok) {
    const errorMessage = data.message || data.errorMessage || data.error || `Upload failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

serve(async (req: Request): Promise<Response> => {
  console.log("SFMC Upload Edge Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    console.log("Parsing request body...");
    const assetData: UploadAssetRequest = await req.json();
    console.log("Asset data received:", assetData.name || "unknown");
    console.log("Asset type ID:", assetData.assetType?.id);
    console.log("Category ID:", assetData.category?.id);

    // Step 1: Authenticate with SFMC
    console.log("Step 1: Authenticating with SFMC...");
    const { accessToken, restInstanceUrl } = await getSfmcAccessToken();
    console.log("Authentication successful, REST URL:", restInstanceUrl);

    // Step 2: Upload asset to SFMC
    console.log("Step 2: Uploading asset to SFMC...");
    const result = await uploadAssetToSfmc(accessToken, restInstanceUrl, assetData);
    console.log("Asset uploaded successfully, ID:", result.id);

    return new Response(JSON.stringify({ 
      success: true, 
      assetId: result.id,
      assetUrl: result.fileProperties?.publishedURL,
      customerKey: result.customerKey,
      name: result.name,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("SFMC Upload Error:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
