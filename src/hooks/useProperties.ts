import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyImage {
  id: string;
  property_id: string | null;
  url: string;
  is_primary: boolean | null;
  created_at: string | null;
}

export interface PropertyData {
  id: string;
  address: string;
  city: string;
  neighborhood: string | null;
  price: number | null;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  has_elevator: boolean | null;
  has_safe_room: boolean | null;
  has_sun_balcony: boolean | null;
  parking_spots: number | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
}

export interface PropertyWithImages extends PropertyData {
  images: PropertyImage[];
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
