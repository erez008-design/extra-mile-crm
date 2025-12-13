import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuyerData {
  id: string;
  full_name: string;
  phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  target_cities: string[] | null;
  target_neighborhoods: string[] | null;
  min_rooms: number | null;
  floor_min: number | null;
  floor_max: number | null;
  required_features: string[] | null;
  notes: string | null;
  created_at: string | null;
}

export function useBuyers() {
  return useQuery({
    queryKey: ["buyers"],
    queryFn: async (): Promise<BuyerData[]> => {
      const { data, error } = await supabase
        .from("buyers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}
