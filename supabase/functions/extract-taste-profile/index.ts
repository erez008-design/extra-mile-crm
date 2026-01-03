import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= AUTHENTICATION CHECK =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has agent, manager, or admin role
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["agent", "manager", "admin"]);

    if (rolesError || !roles || roles.length === 0) {
      console.error("User does not have required role:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - agent/manager/admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} with role ${roles[0].role} is accessing extract-taste-profile`);
    // ============= END AUTHENTICATION CHECK =============

    const { feedback } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!feedback || feedback.length === 0) {
      return new Response(
        JSON.stringify({ 
          global_liked_profile: "",
          global_disliked_profile: "",
          error: "No feedback data provided"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt with all feedback INCLUDING location data
    const likedTexts = feedback
      .filter((f: any) => f.liked_text)
      .map((f: any) => {
        const location = [f.property_address, f.property_city].filter(Boolean).join(", ");
        return location ? `- ${f.liked_text} (נכס: ${location})` : `- ${f.liked_text}`;
      })
      .join("\n");
    
    const dislikedTexts = feedback
      .filter((f: any) => f.disliked_text)
      .map((f: any) => {
        const location = [f.property_address, f.property_city].filter(Boolean).join(", ");
        return location ? `- ${f.disliked_text} (נכס: ${location})` : `- ${f.disliked_text}`;
      })
      .join("\n");
    
    const notInterestedReasons = feedback
      .filter((f: any) => f.not_interested_reason)
      .map((f: any) => {
        const location = [f.property_address, f.property_city].filter(Boolean).join(", ");
        return location ? `- ${f.not_interested_reason} (נכס: ${location})` : `- ${f.not_interested_reason}`;
      })
      .join("\n");

    // Extract locations from not_interested properties for pattern detection
    const notInterestedLocations = feedback
      .filter((f: any) => f.status === "not_interested" || f.not_interested_reason)
      .map((f: any) => [f.property_address, f.property_city].filter(Boolean).join(", "))
      .filter(Boolean)
      .join("\n- ");

    const prompt = `אתה עוזר לסוכני נדל"ן לזהות טעם של לקוחות.

להלן משוב שנאסף מלקוח על מספר נכסים שונים:

**מה הלקוח אהב:**
${likedTexts || "לא צוין"}

**מה הלקוח פחות אהב:**
${dislikedTexts || "לא צוין"}

**סיבות לחוסר עניין:**
${notInterestedReasons || "לא צוין"}

**מיקומים של נכסים שהלקוח לא רצה:**
${notInterestedLocations ? `- ${notInterestedLocations}` : "לא צוין"}

נא לנתח את המשוב ולחלץ:
1. 3-5 נושאים חוזרים חיוביים שהלקוח מעדיף (אהבות כלליות)
2. 3-5 נושאים חוזרים שליליים או דברים שפוסלים נכס (פסילות כלליות)

**חשוב מאוד:** בנוסף לניתוח הטעם הכללי, זהה מיקומים ספציפיים (שכונות, רחובות, ערים) שחוזרים על עצמם בנכסים שהלקוח דחה או לא התעניין בהם. אם מיקום מסוים מופיע מספר פעמים, ציין אותו במפורש ב-global_disliked_profile.

לדוגמה, במקום לכתוב "שכונה ספציפית", כתוב "הקונה לא מעוניין בשכונת נווה יהודה" או "רחוב הרצל והסביבה אינם מתאימים לו".

החזר את התשובה בפורמט JSON הבא בלבד, בעברית:
{
  "global_liked_profile": "תיאור קצר של מה שהלקוח אוהב בנכסים",
  "global_disliked_profile": "תיאור קצר של מה שפוסל נכסים עבור הלקוח, כולל מיקומים ספציפיים אם רלוונטי"
}`;

    console.log("Sending prompt to Lovable AI:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "אתה עוזר AI שמנתח משוב לקוחות על נכסי נדל\"ן. תמיד החזר תשובה בפורמט JSON תקין בעברית." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "מגבלת בקשות - נסה שוב מאוחר יותר" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "נדרש תשלום - אנא הוסף קרדיטים" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI content:", content);

    // Parse the JSON response from AI
    let result = {
      global_liked_profile: "",
      global_disliked_profile: "",
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.global_liked_profile = parsed.global_liked_profile || "";
        result.global_disliked_profile = parsed.global_disliked_profile || "";
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Return the raw content if parsing fails
      result.global_liked_profile = content;
    }

    console.log("Final result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-taste-profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
