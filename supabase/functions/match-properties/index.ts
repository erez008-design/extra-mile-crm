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
    const { buyerId, saveToDb = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    if (!buyerId) {
      return new Response(
        JSON.stringify({ error: "buyerId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch buyer with all filter fields and taste profile
    const { data: buyer, error: buyerError } = await supabase
      .from("buyers")
      .select(`
        id, full_name, 
        global_liked_profile, global_disliked_profile, client_match_summary,
        budget_min, budget_max, min_rooms,
        target_cities, target_neighborhoods,
        required_features, floor_min, floor_max
      `)
      .eq("id", buyerId)
      .single();

    if (buyerError || !buyer) {
      console.error("Error fetching buyer:", buyerError);
      return new Response(
        JSON.stringify({ error: "Buyer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if buyer has taste profile
    if (!buyer.global_liked_profile && !buyer.global_disliked_profile && !buyer.client_match_summary) {
      return new Response(
        JSON.stringify({ 
          error: "הקונה עדיין לא מילא פרופיל טעם. יש למלא את הפרופיל קודם או ללחוץ על 'הצעת AI לזיקוק טעם'",
          matches: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get already assigned properties to exclude
    const { data: assignedProperties } = await supabase
      .from("buyer_properties")
      .select("property_id, agent_feedback, status")
      .eq("buyer_id", buyerId);

    const assignedIds = assignedProperties?.map(p => p.property_id) || [];
    
    // Extract agent feedback for learning (only from properties with feedback)
    const agentFeedbackList = assignedProperties
      ?.filter(p => p.agent_feedback && p.agent_feedback.trim().length > 0)
      .map(p => ({
        feedback: p.agent_feedback,
        status: p.status,
      })) || [];

    // Fetch ALL available properties first (for tracking hard filter failures)
    const { data: allProperties, error: allPropsError } = await supabase
      .from("properties")
      .select(`
        id, address, city, neighborhood, price, rooms, size_sqm, floor, 
        has_safe_room, has_sun_balcony, parking_spots, has_elevator, description,
        property_images (id, url, is_primary)
      `)
      .eq("status", "available");

    if (allPropsError) {
      console.error("Error fetching properties:", allPropsError);
      throw new Error("Failed to fetch properties");
    }

    // Filter out already assigned properties
    let candidateProperties = (allProperties || []).filter(p => !assignedIds.includes(p.id));
    
    // Track hard filter failures for each property
    const failedMatches: Array<{ property_id: string; reason: string }> = [];
    
    // Apply HARD FILTERS with exclusion tracking
    const passedProperties = candidateProperties.filter(p => {
      // HARD FILTER 1: Budget (±20% flexibility)
      if (buyer.budget_min) {
        const minPrice = buyer.budget_min * 0.8;
        if (p.price < minPrice) {
          failedMatches.push({ property_id: p.id, reason: "מחיר מתחת לטווח התקציב" });
          return false;
        }
      }
      if (buyer.budget_max) {
        const maxPrice = buyer.budget_max * 1.2;
        if (p.price > maxPrice) {
          failedMatches.push({ property_id: p.id, reason: "מחיר מעל לטווח התקציב" });
          return false;
        }
      }

      // HARD FILTER 2: Minimum rooms
      if (buyer.min_rooms && (p.rooms === null || p.rooms < buyer.min_rooms)) {
        failedMatches.push({ property_id: p.id, reason: `נדרשים לפחות ${buyer.min_rooms} חדרים` });
        return false;
      }

      // HARD FILTER 3: Target cities
      if (buyer.target_cities && buyer.target_cities.length > 0) {
        if (!buyer.target_cities.includes(p.city)) {
          failedMatches.push({ property_id: p.id, reason: "עיר לא תואמת" });
          return false;
        }
      }

      // HARD FILTER 4: Required features
      if (buyer.required_features && buyer.required_features.length > 0) {
        for (const feature of buyer.required_features) {
          if (feature === "has_safe_room" && !p.has_safe_room) {
            failedMatches.push({ property_id: p.id, reason: "אין ממ״ד" });
            return false;
          }
          if (feature === "has_sun_balcony" && !p.has_sun_balcony) {
            failedMatches.push({ property_id: p.id, reason: "אין מרפסת שמש" });
            return false;
          }
          if (feature === "parking_spots" && (!p.parking_spots || p.parking_spots < 1)) {
            failedMatches.push({ property_id: p.id, reason: "אין חניה" });
            return false;
          }
          if (feature === "has_elevator" && !p.has_elevator) {
            failedMatches.push({ property_id: p.id, reason: "אין מעלית" });
            return false;
          }
        }
      }

      // HARD FILTER 5: Floor range
      if (buyer.floor_min !== null && buyer.floor_min !== undefined) {
        if (p.floor === null || p.floor < buyer.floor_min) {
          failedMatches.push({ property_id: p.id, reason: `קומה נמוכה מ-${buyer.floor_min}` });
          return false;
        }
      }
      if (buyer.floor_max !== null && buyer.floor_max !== undefined) {
        if (p.floor !== null && p.floor > buyer.floor_max) {
          failedMatches.push({ property_id: p.id, reason: `קומה גבוהה מ-${buyer.floor_max}` });
          return false;
        }
      }

      // HARD FILTER 6: Target neighborhoods
      // IMPORTANT: Empty/NULL target_neighborhoods = WILDCARD (all properties in city pass)
      if (buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0) {
        // Only filter if buyer specified neighborhoods
        if (!p.neighborhood || !buyer.target_neighborhoods.includes(p.neighborhood)) {
          failedMatches.push({ property_id: p.id, reason: "שכונה לא תואמת" });
          return false;
        }
      }
      // If no target_neighborhoods specified, property passes (wildcard behavior)

      return true;
    });

    console.log(`Hard filters applied. ${passedProperties.length} passed, ${failedMatches.length} failed for buyer ${buyerId}`);

    // Save failed matches to DB with hard_filter_passed = false
    if (saveToDb && failedMatches.length > 0) {
      const failedRecords = failedMatches.map(m => ({
        buyer_id: buyerId,
        property_id: m.property_id,
        match_score: 0,
        match_reason: m.reason,
        hard_filter_passed: false,
        updated_at: new Date().toISOString(),
      }));

      const { error: failedUpsertError } = await supabase
        .from("matches")
        .upsert(failedRecords, { 
          onConflict: "buyer_id,property_id",
          ignoreDuplicates: false 
        });

      if (failedUpsertError) {
        console.error("Error saving failed matches:", failedUpsertError);
      } else {
        console.log(`Saved ${failedRecords.length} failed hard filter matches for buyer ${buyerId}`);
      }
    }

    if (passedProperties.length === 0) {
      // Clear any old passing matches when no properties pass hard filters
      if (saveToDb) {
        await supabase.from("matches").delete().eq("buyer_id", buyerId).eq("hard_filter_passed", true);
      }
      
      return new Response(
        JSON.stringify({ 
          message: "אין נכסים זמינים התואמים לדרישות הקונה",
          matches: [],
          failed_count: failedMatches.length,
          filters_applied: {
            budget: buyer.budget_min || buyer.budget_max ? `₪${buyer.budget_min?.toLocaleString() || '0'} - ₪${buyer.budget_max?.toLocaleString() || '∞'}` : null,
            min_rooms: buyer.min_rooms,
            cities: buyer.target_cities,
            neighborhoods: buyer.target_neighborhoods,
            features: buyer.required_features,
            floor_range: (buyer.floor_min || buyer.floor_max) ? `${buyer.floor_min || '0'} - ${buyer.floor_max || '∞'}` : null
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const properties = passedProperties;

    // Build properties summary for AI (only filtered properties)
    const propertiesSummary = properties.map(p => ({
      id: p.id,
      summary: `נכס ב${p.address}, ${p.city}. ${p.rooms || "?"} חדרים, ${p.size_sqm || "?"} מ"ר, קומה ${p.floor || "?"}, מחיר: ₪${p.price?.toLocaleString() || "?"}. ${p.has_safe_room ? "יש ממ\"ד" : "אין ממ\"ד"}, ${p.has_sun_balcony ? "יש מרפסת שמש" : ""}, ${p.has_elevator ? "יש מעלית" : ""}, ${p.parking_spots || 0} חניות. ${p.description || ""}`
    }));

    // Build agent feedback context for AI
    let agentFeedbackContext = "";
    if (agentFeedbackList.length > 0) {
      const negativeFeedback = agentFeedbackList
        .filter(f => f.status === "not_interested")
        .map(f => f.feedback);
      const positiveFeedback = agentFeedbackList
        .filter(f => f.status === "interested" || f.status === "visited")
        .map(f => f.feedback);
      
      if (negativeFeedback.length > 0 || positiveFeedback.length > 0) {
        agentFeedbackContext = `
**הערות סוכן על נכסים קודמים (חשוב מאוד!):**
${negativeFeedback.length > 0 ? `דברים שהלקוח לא אהב: ${negativeFeedback.join("; ")}` : ""}
${positiveFeedback.length > 0 ? `דברים שהלקוח אהב: ${positiveFeedback.join("; ")}` : ""}

⚠️ חשוב: אם נכס מכיל תכונה שהסוכן ציין שהלקוח לא אהב - הורד את הציון משמעותית!
`;
      }
    }

    // Build AI prompt for soft matching/ranking
    const prompt = `אתה עוזר לסוכני נדל"ן להתאים נכסים ללקוחות.

פרופיל הטעם של הלקוח "${buyer.full_name}":

**מה הלקוח אוהב:**
${buyer.global_liked_profile || "לא צוין"}

**מה הלקוח לא אוהב / פוסל:**
${buyer.global_disliked_profile || "לא צוין"}

**סיכום כללי:**
${buyer.client_match_summary || "לא צוין"}
${agentFeedbackContext}
להלן רשימת נכסים שעברו סינון ראשוני לפי דרישות הלקוח (תקציב, חדרים, עיר, תכונות נדרשות):
${propertiesSummary.map((p, i) => `${i + 1}. [ID: ${p.id}] ${p.summary}`).join("\n")}

נא לדרג את הנכסים לפי התאמה לפרופיל הטעם של הלקוח.
שים לב במיוחד לדברים שהלקוח לא אוהב - אם נכס מכיל משהו מהרשימה השלילית, תן לו ציון נמוך או אל תכלול אותו.
**חשוב במיוחד: התייחס להערות הסוכן על נכסים קודמים - אלו תובנות אמיתיות על העדפות הלקוח!**

החזר JSON עם מערך של עד 10 נכסים מותאמים, מהכי מתאים לפחות מתאים.

פורמט התשובה (JSON בלבד):
{
  "matches": [
    {
      "property_id": "uuid של הנכס",
      "match_score": מספר בין 1-100,
      "match_reason": "הסבר קצר מדוע הנכס מתאים או לא"
    }
  ]
}

דרג רק נכסים שיש להם התאמה של לפחות 40 נקודות.
אם נכס מכיל משהו שהלקוח פוסל במפורש או שהסוכן ציין שהלקוח לא אהב - אל תכלול אותו.`;

    console.log("Sending AI matching request for buyer:", buyerId, "with", properties.length, "pre-filtered properties");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "אתה עוזר AI להתאמת נכסי נדל\"ן. תמיד החזר תשובה בפורמט JSON תקין." },
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
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI matching response:", content);

    // Parse AI response
    let matches: Array<{ property_id: string; match_score: number; match_reason: string }> = [];
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        matches = parsed.matches || [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Enrich matches with full property data
    const enrichedMatches = matches.map(match => {
      const property = properties.find(p => p.id === match.property_id);
      return {
        ...match,
        property: property || null
      };
    }).filter(m => m.property !== null);

    console.log(`AI returned ${enrichedMatches.length} matching properties for buyer ${buyerId}`);

    // Save matches to database if requested (for real-time automation)
    if (saveToDb && enrichedMatches.length > 0) {
      // First, clear existing matches for this buyer that aren't in the new results
      const newPropertyIds = enrichedMatches.map(m => m.property_id);
      
      // Delete old matches not in new results
      await supabase
        .from("matches")
        .delete()
        .eq("buyer_id", buyerId)
        .not("property_id", "in", `(${newPropertyIds.join(",")})`);

      // Upsert new matches
      const matchRecords = enrichedMatches.map(m => ({
        buyer_id: buyerId,
        property_id: m.property_id,
        match_score: m.match_score,
        match_reason: m.match_reason,
        hard_filter_passed: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("matches")
        .upsert(matchRecords, { 
          onConflict: "buyer_id,property_id",
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error("Error saving matches to DB:", upsertError);
      } else {
        console.log(`Saved ${matchRecords.length} matches to database for buyer ${buyerId}`);
      }

      // Create notifications for high-score matches (70%+)
      const highScoreMatches = enrichedMatches.filter(m => m.match_score >= 70);
      
      if (highScoreMatches.length > 0) {
        // Get the agent for this buyer
        const { data: buyerAgent } = await supabase
          .from("buyer_agents")
          .select("agent_id")
          .eq("buyer_id", buyerId)
          .limit(1)
          .single();

        if (buyerAgent?.agent_id) {
          const notificationRecords = highScoreMatches.map(m => ({
            buyer_id: buyerId,
            agent_id: buyerAgent.agent_id,
            property_id: m.property_id,
            match_score: m.match_score,
            match_reason: m.match_reason,
            is_read_by_agent: false,
            is_read_by_manager: false,
          }));

          const { error: notifError } = await supabase
            .from("notifications")
            .insert(notificationRecords);

          if (notifError) {
            console.error("Error creating notifications:", notifError);
          } else {
            console.log(`Created ${notificationRecords.length} notifications for high-score matches`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        buyer_name: buyer.full_name,
        matches: enrichedMatches,
        total_filtered: properties.length,
        failed_count: failedMatches.length,
        filters_applied: {
          budget: buyer.budget_min || buyer.budget_max ? `₪${buyer.budget_min?.toLocaleString() || '0'} - ₪${buyer.budget_max?.toLocaleString() || '∞'}` : null,
          min_rooms: buyer.min_rooms,
          cities: buyer.target_cities,
          neighborhoods: buyer.target_neighborhoods,
          features: buyer.required_features,
          floor_range: (buyer.floor_min || buyer.floor_max) ? `${buyer.floor_min || '0'} - ${buyer.floor_max || '∞'}` : null
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("match-properties error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
