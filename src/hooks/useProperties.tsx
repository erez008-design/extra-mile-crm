import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyWithImages {
  id: string;
  address: string;
  city: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  floor: number | null;
  status: string | null;
  description: string | null;
  has_elevator: boolean | null;
  has_safe_room: boolean | null;
  has_sun_balcony: boolean | null;
  parking_spots: number | null;
  created_at: string | null;
  images: { id: string; url: string; is_primary: boolean | null }[];
}

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async (): Promise<PropertyWithImages[]> => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: images, error: imagesError } = await supabase
        .from("property_images")
        .select("*");

      if (imagesError) throw imagesError;

      return (properties || []).map((property) => ({
        ...property,
        images: (images || []).filter((img) => img.property_id === property.id),
      }));
    },
  });
}

export function useNeighborhoods() {
  return useQuery({
    queryKey: ["neighborhoods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhoods_lookup")
        .select("*")
        .order("city_name");

      if (error) throw error;
      return data || [];
    },
  });
}
