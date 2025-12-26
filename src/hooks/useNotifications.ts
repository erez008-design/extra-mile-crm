import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  buyer_id: string;
  agent_id: string;
  property_id: string;
  match_score: number;
  match_reason: string | null;
  is_read_by_agent: boolean;
  is_read_by_manager: boolean;
  created_at: string;
  buyer?: { full_name: string };
  property?: { address: string; city: string };
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          buyer:buyers(full_name),
          property:properties(address, city)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read_by_agent).length ?? 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read_by_agent: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read_by_agent: true })
        .eq("agent_id", user.id)
        .eq("is_read_by_agent", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: notifications ?? [],
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export function useManagerNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["manager-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          buyer:buyers(full_name),
          property:properties(address, city)
        `)
        .order("match_score", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read_by_manager).length ?? 0;

  const markAsReadByManager = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read_by_manager: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-notifications"] });
    },
  });

  return {
    notifications: notifications ?? [],
    isLoading,
    unreadCount,
    markAsReadByManager,
  };
}
