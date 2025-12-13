import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyWithImages } from "./useProperties";
import { BuyerData } from "./useBuyers";

export interface MatchedProperty extends PropertyWithImages {
  matchScore: number;
  matchReasons: string[];
}

export function usePropertyMatching(buyer: BuyerData | null) {
  return useQuery({
    queryKey: ["property-matching", buyer?.id],
    queryFn: async (): Promise<MatchedProperty[]> => {
      if (!buyer) return [];

      // Fetch all properties with images
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: images, error: imagesError } = await supabase
        .from("property_images")
        .select("*");

      if (imagesError) throw imagesError;

      const propertiesWithImages = (properties || []).map((property) => ({
        ...property,
        images: (images || []).filter((img) => img.property_id === property.id),
      })) as PropertyWithImages[];

      // Apply matching logic
      return propertiesWithImages
        .map((property) => {
          const matchReasons: string[] = [];
          let matchScore = 0;

          // Check budget match
          if (buyer.budget_min !== null && buyer.budget_max !== null && property.price !== null) {
            if (property.price >= buyer.budget_min && property.price <= buyer.budget_max) {
              matchScore += 30;
              matchReasons.push("תקציב מתאים");
            }
          } else if (buyer.budget_max !== null && property.price !== null) {
            if (property.price <= buyer.budget_max) {
              matchScore += 25;
              matchReasons.push("בטווח תקציב");
            }
          }

          // Check city match
          if (buyer.target_cities && buyer.target_cities.length > 0) {
            if (buyer.target_cities.includes(property.city)) {
              matchScore += 25;
              matchReasons.push("עיר מועדפת");
            }
          }

          // Check neighborhood match
          if (buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0 && property.neighborhood) {
            if (buyer.target_neighborhoods.includes(property.neighborhood)) {
              matchScore += 15;
              matchReasons.push("שכונה מועדפת");
            }
          }

          // Check rooms match
          if (buyer.min_rooms !== null && property.rooms !== null) {
            if (property.rooms >= buyer.min_rooms) {
              matchScore += 15;
              matchReasons.push("מספר חדרים מתאים");
            }
          }

          // Check floor match
          if (property.floor !== null) {
            if (buyer.floor_min !== null && buyer.floor_max !== null) {
              if (property.floor >= buyer.floor_min && property.floor <= buyer.floor_max) {
                matchScore += 10;
                matchReasons.push("קומה מתאימה");
              }
            } else if (buyer.floor_min !== null && property.floor >= buyer.floor_min) {
              matchScore += 5;
              matchReasons.push("קומה מינימלית");
            }
          }

          // Check required features
          if (buyer.required_features && buyer.required_features.length > 0) {
            const propertyFeatures: string[] = [];
            if (property.has_elevator) propertyFeatures.push("מעלית");
            if (property.has_safe_room) propertyFeatures.push("ממ״ד");
            if (property.has_sun_balcony) propertyFeatures.push("מרפסת שמש");
            if (property.parking_spots && property.parking_spots > 0) propertyFeatures.push("חניה");

            const matchedFeatures = buyer.required_features.filter((f) =>
              propertyFeatures.includes(f)
            );
            if (matchedFeatures.length > 0) {
              matchScore += matchedFeatures.length * 5;
              matchReasons.push(`${matchedFeatures.length} תכונות נדרשות`);
            }
          }

          return {
            ...property,
            matchScore,
            matchReasons,
          };
        })
        .filter((p) => p.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
    },
    enabled: !!buyer,
  });
}
