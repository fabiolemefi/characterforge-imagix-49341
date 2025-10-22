import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UploadAssetRequest {
  assetType: { name: string; id: number };
  name: string;
  file: string; // base64
  category?: { id: number };
  customerKey?: string;
  fileProperties?: { fileName: string; extension: string };
  views?: {
    html?: { content: string };
    subjectline?: { content: string };
    preheader?: { content: string };
  };
}

serve(async (req: Request): Promise<Response> => {
  console.log("Edge function called");
  
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Parsing request body...");
    const assetData: UploadAssetRequest = await req.json();
    console.log("Asset data received:", assetData.name || "unknown");

    // 1. Gera o token seguro no servidor
    console.log("Requesting auth token...");
    const authResponse = await fetch("https://mcn3dvqncqsps20bqzd6yb8r97ty.auth.marketingcloudapis.com/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("SFMC_CLIENT_ID"),
        client_secret: Deno.env.get("SFMC_CLIENT_SECRET"),
      }),
    });

    console.log("Auth response status:", authResponse.status);

    if (!authResponse.ok) {
      const text = await authResponse.text();
      console.error("Auth failed:", text);
      throw new Error(`Auth failed: ${authResponse.status} - ${text}`);
    }

    const { access_token } = await authResponse.json();
    if (!access_token) {
      console.error("No access token in response");
      throw new Error("No access token returned");
    }

    console.log("Token obtained, sending to Worker...");
    
    // 2. Encaminha a requisição ao Worker com o token
    const proxyResponse = await fetch("https://proxyaccess.duarteleme.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFMC-Token": access_token,
      },
      body: JSON.stringify(assetData),
    });

    console.log("Worker response status:", proxyResponse.status);
    const text = await proxyResponse.text();
    console.log("Worker response:", text.substring(0, 200));

    return new Response(text, {
      status: proxyResponse.status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Edge error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
