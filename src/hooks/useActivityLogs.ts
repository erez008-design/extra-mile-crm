import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type ActivityActionType = 
  | 'property_offered'
  | 'note_added'
  | 'feedback_added'
  | 'link_viewed'
  | 'status_changed'
  | 'buyer_created'
  | 'match_found'
  | 'whatsapp_sent'
  | 'file_uploaded';

export interface ActivityLog {
  id: string;
  buyer_id: string | null;
  agent_id: string | null;
  action_type: ActivityActionType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  buyer?: {
    full_name: string;
  } | null;
}

// Hook for fetching activity logs for a specific buyer
export function useBuyerActivityLogs(buyerId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activity-logs", "buyer", buyerId],
    queryFn: async () => {
      if (!buyerId) return [];
      
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!buyerId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!buyerId) return;

    const channel = supabase
      .channel(`activity-logs-buyer-${buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `buyer_id=eq.${buyerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-logs", "buyer", buyerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buyerId, queryClient]);

  return query;
}

// Hook for fetching all activity logs (for managers)
export function useAllActivityLogs(limit = 100) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activity-logs", "all", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          buyer:buyers(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  // Subscribe to realtime updates for all activity logs
  useEffect(() => {
    const channel = supabase
      .channel("activity-logs-all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-logs", "all"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Helper to get icon and color for action type
export function getActivityIcon(actionType: ActivityActionType) {
  switch (actionType) {
    case 'property_offered':
      return { icon: 'Home', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    case 'note_added':
      return { icon: 'MessageSquare', color: 'text-purple-500', bgColor: 'bg-purple-500/10' };
    case 'feedback_added':
      return { icon: 'FileText', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    case 'link_viewed':
      return { icon: 'Eye', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    case 'status_changed':
      return { icon: 'RefreshCw', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    case 'buyer_created':
      return { icon: 'UserPlus', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' };
    case 'match_found':
      return { icon: 'Sparkles', color: 'text-pink-500', bgColor: 'bg-pink-500/10' };
    case 'whatsapp_sent':
      return { icon: 'MessageCircle', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' };
    case 'file_uploaded':
      return { icon: 'Camera', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
    default:
      return { icon: 'Activity', color: 'text-muted-foreground', bgColor: 'bg-muted' };
  }
}

// Helper to get Hebrew label for action type
export function getActivityLabel(actionType: ActivityActionType) {
  switch (actionType) {
    case 'property_offered':
      return 'נכס הוצע';
    case 'note_added':
      return 'הערה נוספה';
    case 'feedback_added':
      return 'משוב סוכן';
    case 'link_viewed':
      return 'צפייה בקישור';
    case 'status_changed':
      return 'סטטוס שונה';
    case 'buyer_created':
      return 'לקוח נוצר';
    case 'match_found':
      return 'התאמה נמצאה';
    case 'whatsapp_sent':
      return 'WhatsApp נשלח';
    case 'file_uploaded':
      return 'מדיה נוספה';
    default:
      return 'פעילות';
  }
}
