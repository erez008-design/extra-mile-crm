import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, record, old_record } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Trigger matching: type=${type}, record_id=${record?.id}`);

    let buyerIds: string[] = [];

    if (type === "property_change") {
      // Property was created or updated - find all buyers who might match
      const { data: buyers, error: buyersError } = await supabase
        .from("buyers")
        .select("id, target_cities, target_neighborhoods, budget_min, budget_max, min_rooms, required_features, floor_min, floor_max")
        .not("global_liked_profile", "is", null);

      if (buyersError) {
        console.error("Error fetching buyers:", buyersError);
        throw buyersError;
      }

      // Filter buyers whose hard filters might match this property
      const property = record;
      buyerIds = (buyers || [])
        .filter(buyer => {
          // Check if buyer's city filter includes this property's city
          if (buyer.target_cities && buyer.target_cities.length > 0) {
            if (!buyer.target_cities.includes(property.city)) {
              return false;
            }
          }
          // Check budget range (with 20% flexibility)
          if (buyer.budget_min && property.price < buyer.budget_min * 0.8) {
            return false;
          }
          if (buyer.budget_max && property.price > buyer.budget_max * 1.2) {
            return false;
          }
          return true;
        })
        .map(b => b.id);

      console.log(`Property change: ${buyerIds.length} potential buyers to rematch`);

    } else if (type === "buyer_filter_change") {
      // Buyer's filters were updated - rematch just this buyer
      buyerIds = [record.id];
      console.log(`Buyer filter change: rematching buyer ${record.id}`);
    }

    // Trigger matching for each buyer (in background)
    const matchPromises = buyerIds.map(async (buyerId) => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/match-properties`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ buyerId, saveToDb: true }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Match failed for buyer ${buyerId}:`, errorText);
        } else {
          console.log(`Matching completed for buyer ${buyerId}`);
        }
      } catch (error) {
        console.error(`Error matching buyer ${buyerId}:`, error);
      }
    });

    // Use waitUntil for background processing
    EdgeRuntime.waitUntil(Promise.all(matchPromises));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Triggered matching for ${buyerIds.length} buyers`,
        buyer_ids: buyerIds 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("trigger-matching error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
