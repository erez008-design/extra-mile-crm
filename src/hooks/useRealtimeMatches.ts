import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MatchedProperty {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number | null;
  size_sqm?: number | null;
  floor?: number | null;
  has_safe_room?: boolean;
  has_sun_balcony?: boolean;
  parking_spots?: number;
  has_elevator?: boolean;
  property_images?: Array<{ id: string; url: string; is_primary: boolean }>;
}

interface Match {
  id: string;
  buyer_id: string;
  property_id: string;
  match_score: number;
  match_reason: string | null;
  hard_filter_passed: boolean;
  created_at: string;
  updated_at: string;
  property?: MatchedProperty;
}

interface MatchesByBuyer {
  [buyerId: string]: Match[];
}

export const useRealtimeMatches = (buyerIds: string[]) => {
  const [matches, setMatches] = useState<MatchesByBuyer>({});
  const [excludedMatches, setExcludedMatches] = useState<MatchesByBuyer>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial matches (both passed and failed)
  const fetchMatches = useCallback(async () => {
    if (buyerIds.length === 0) {
      setMatches({});
      setExcludedMatches({});
      setLoading(false);
      return;
    }

    try {
      // Fetch passed matches
      const { data: passedData, error: passedError } = await supabase
        .from("matches")
        .select(`
          id,
          buyer_id,
          property_id,
          match_score,
          match_reason,
          hard_filter_passed,
          created_at,
          updated_at,
          properties:property_id (
            id,
            address,
            city,
            price,
            rooms,
            size_sqm,
            floor,
            has_safe_room,
            has_sun_balcony,
            parking_spots,
            has_elevator,
            property_images (id, url, is_primary)
          )
        `)
        .in("buyer_id", buyerIds)
        .eq("hard_filter_passed", true)
        .order("match_score", { ascending: false });

      if (passedError) {
        console.error("Error fetching passed matches:", passedError);
      }

      // Fetch excluded matches (hard_filter_passed = false)
      const { data: excludedData, error: excludedError } = await supabase
        .from("matches")
        .select(`
          id,
          buyer_id,
          property_id,
          match_score,
          match_reason,
          hard_filter_passed,
          created_at,
          updated_at,
          properties:property_id (
            id,
            address,
            city,
            price,
            rooms,
            size_sqm,
            floor,
            has_safe_room,
            has_sun_balcony,
            parking_spots,
            has_elevator,
            property_images (id, url, is_primary)
          )
        `)
        .in("buyer_id", buyerIds)
        .eq("hard_filter_passed", false)
        .order("created_at", { ascending: false });

      if (excludedError) {
        console.error("Error fetching excluded matches:", excludedError);
      }

      // Group passed matches by buyer_id
      const groupedPassed: MatchesByBuyer = {};
      (passedData || []).forEach((match: any) => {
        const buyerId = match.buyer_id;
        if (!groupedPassed[buyerId]) {
          groupedPassed[buyerId] = [];
        }
        groupedPassed[buyerId].push({
          ...match,
          property: match.properties,
        });
      });

      // Group excluded matches by buyer_id
      const groupedExcluded: MatchesByBuyer = {};
      (excludedData || []).forEach((match: any) => {
        const buyerId = match.buyer_id;
        if (!groupedExcluded[buyerId]) {
          groupedExcluded[buyerId] = [];
        }
        groupedExcluded[buyerId].push({
          ...match,
          property: match.properties,
        });
      });

      setMatches(groupedPassed);
      setExcludedMatches(groupedExcluded);
    } catch (error) {
      console.error("Error in fetchMatches:", error);
    } finally {
      setLoading(false);
    }
  }, [buyerIds]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (buyerIds.length === 0) return;

    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        (payload) => {
          console.log("Real-time match update:", payload);
          
          // Check if this match belongs to one of our buyers
          const newMatch = payload.new as Match | undefined;
          const oldMatch = payload.old as Match | undefined;
          const relevantBuyerId = newMatch?.buyer_id || oldMatch?.buyer_id;
          
          if (relevantBuyerId && buyerIds.includes(relevantBuyerId)) {
            // Refetch to get complete data with property details
            fetchMatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buyerIds, fetchMatches]);

  // Trigger matching for a specific buyer
  const triggerMatching = useCallback(async (buyerId: string) => {
    try {
      const { error } = await supabase.functions.invoke("trigger-matching", {
        body: { 
          type: "buyer_filter_change", 
          record: { id: buyerId } 
        },
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error triggering matching:", error);
      return false;
    }
  }, []);

  return { matches, excludedMatches, loading, refetch: fetchMatches, triggerMatching };
};
