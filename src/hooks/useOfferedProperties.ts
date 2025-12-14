import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OfferedProperty {
  id: string;
  property_id: string;
  buyer_id: string;
  status: string | null;
  note: string | null;
  updated_at: string | null;
  property: {
    id: string;
    address: string;
    city: string;
    neighborhood: string | null;
    price: number | null;
    rooms: number | null;
    size_sqm: number | null;
    images: { url: string; is_primary: boolean | null }[];
  };
}

export function useOfferedProperties(buyerId: string | null) {
  return useQuery({
    queryKey: ["offeredProperties", buyerId],
    queryFn: async (): Promise<OfferedProperty[]> => {
      if (!buyerId) return [];

      const { data, error } = await supabase
        .from("buyer_properties")
        .select(`
          id,
          property_id,
          buyer_id,
          status,
          note,
          updated_at,
          property:properties!buyer_properties_property_id_fkey (
            id,
            address,
            city,
            neighborhood,
            price,
            rooms,
            size_sqm
          )
        `)
        .eq("buyer_id", buyerId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch images for each property
      const propertyIds = data?.map((d) => d.property_id).filter(Boolean) as string[];
      const { data: imagesData } = await supabase
        .from("property_images")
        .select("property_id, url, is_primary")
        .in("property_id", propertyIds);

      const imagesMap = new Map<string, { url: string; is_primary: boolean | null }[]>();
      imagesData?.forEach((img) => {
        if (!imagesMap.has(img.property_id!)) {
          imagesMap.set(img.property_id!, []);
        }
        imagesMap.get(img.property_id!)!.push({ url: img.url, is_primary: img.is_primary });
      });

      return (data || []).map((item) => ({
        ...item,
        property: {
          ...item.property,
          images: imagesMap.get(item.property_id!) || [],
        },
      })) as OfferedProperty[];
    },
    enabled: !!buyerId,
  });
}

export function useMarkAsOffered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ buyerId, propertyId }: { buyerId: string; propertyId: string }) => {
      // Get current user for agent_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("buyer_properties").insert({
        buyer_id: buyerId,
        property_id: propertyId,
        agent_id: user.id,
        status: "offered",
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["offeredProperties", variables.buyerId] });
    },
  });
}

export function useDeleteBuyer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (buyerId: string) => {
      const { error } = await supabase.from("buyers").delete().eq("id", buyerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
    },
  });
}
