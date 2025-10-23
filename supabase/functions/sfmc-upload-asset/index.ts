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

    // 🚀 MUDANÇA: APONTA PARA SUA VPS!
    console.log("Sending to VPS Proxy...");
    const proxyResponse = await fetch("http://216.126.236.244/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFMC-Client-ID": Deno.env.get("SFMC_CLIENT_ID") || "",
        "X-SFMC-Client-Secret": Deno.env.get("SFMC_CLIENT_SECRET") || "",
      },
      body: JSON.stringify(assetData),
    });

    console.log("VPS response status:", proxyResponse.status);
    const text = await proxyResponse.text();
    console.log("VPS response:", text.substring(0, 200));

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
