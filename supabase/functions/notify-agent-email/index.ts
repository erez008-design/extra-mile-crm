import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAgentRequest {
  agent_id: string;
  buyer_name: string;
  property_address: string;
  property_city?: string;
  property_id?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, buyer_name, property_address, property_city, property_id }: NotifyAgentRequest = await req.json();

    if (!agent_id || !buyer_name || !property_address) {
      console.error("Missing required fields:", { agent_id, buyer_name, property_address });
      return new Response(
        JSON.stringify({ error: "Missing required fields: agent_id, buyer_name, property_address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch agent email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", agent_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Failed to fetch agent profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Agent profile not found or no email configured" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentEmail = profile.email;
    const agentName = profile.full_name || "סוכן";
    const propertyLocation = property_city ? `${property_address}, ${property_city}` : property_address;

    console.log(`Sending email to agent ${agentName} (${agentEmail}) about buyer ${buyer_name} for property ${propertyLocation}`);

    // Send email via Resend using fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ExtraMile CRM <onboarding@resend.dev>",
        to: [agentEmail],
        subject: `בקשת מידע חדשה מ-${buyer_name}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #2563eb;">בקשת מידע חדשה</h2>
            <p>שלום ${agentName},</p>
            <p>הלקוח <strong>${buyer_name}</strong> מעוניין לקבל מידע נוסף על הנכס:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; font-size: 16px;"><strong>${propertyLocation}</strong></p>
              ${property_id ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">מזהה נכס: ${property_id}</p>` : ''}
            </div>
            <p>מומלץ ליצור קשר עם הלקוח בהקדם האפשרי.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;">הודעה זו נשלחה אוטומטית ממערכת ExtraMile CRM</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", data: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-agent-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
