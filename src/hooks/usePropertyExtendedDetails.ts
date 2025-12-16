import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// TypeScript types for the table
export interface PropertyExtendedDetails {
  id: string;
  property_id: string;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  elevators_count: number | null;
  tenants_count: number | null;
  parking_count: number | null;
  parking_covered: boolean | null;
  parking_type: string[] | null;
  has_storage: boolean | null;
  storage_size_sqm: number | null;
  balcony_size_sqm: number | null;
  renovation_level: "new" | "renovated" | "needs_renovation" | null;
  bathrooms: number | null;
  toilets: number | null;
  building_year: number | null;
  air_directions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyExtendedDetailsInsert {
  property_id: string;
  floor?: number | null;
  total_floors?: number | null;
  has_elevator?: boolean | null;
  elevators_count?: number | null;
  tenants_count?: number | null;
  parking_count?: number | null;
  parking_covered?: boolean | null;
  parking_type?: string[] | null;
  has_storage?: boolean | null;
  storage_size_sqm?: number | null;
  balcony_size_sqm?: number | null;
  renovation_level?: "new" | "renovated" | "needs_renovation" | null;
  bathrooms?: number | null;
  toilets?: number | null;
  building_year?: number | null;
  air_directions?: string[] | null;
}

// Hook to get extended property details by property_id
export function useGetExtendedProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property_extended_details", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      
      const { data, error } = await supabase
        .from("property_extended_details")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (error) throw error;
      return data as PropertyExtendedDetails | null;
    },
    enabled: !!propertyId,
  });
}

// Hook to upsert extended property details
export function useUpsertExtendedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (details: PropertyExtendedDetailsInsert) => {
      const { data, error } = await supabase
        .from("property_extended_details")
        .upsert(details, { onConflict: "property_id" })
        .select()
        .single();

      if (error) throw error;
      return data as PropertyExtendedDetails;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["property_extended_details", data.property_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["property_extended_details"] 
      });
    },
  });
}
