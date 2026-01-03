import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuyerActivityStats {
  buyer_id: string;
  uploads_count: number;
  has_notes: boolean;
  last_activity_at: string | null;
  has_recent_activity: boolean; // Activity in last 24 hours
}

export function useBuyerActivityStats(buyerIds: string[]) {
  return useQuery({
    queryKey: ["buyer-activity-stats", buyerIds],
    queryFn: async (): Promise<Record<string, BuyerActivityStats>> => {
      if (buyerIds.length === 0) return {};

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch uploads count per buyer
      const { data: uploadsData, error: uploadsError } = await supabase
        .from("buyer_uploads")
        .select("buyer_id, created_at")
        .in("buyer_id", buyerIds);

      if (uploadsError) {
        console.error("Error fetching uploads:", uploadsError);
      }

      // Fetch notes from buyer_properties (check if note is not empty)
      const { data: notesData, error: notesError } = await supabase
        .from("buyer_properties")
        .select("buyer_id, note, updated_at")
        .in("buyer_id", buyerIds)
        .not("note", "is", null);

      if (notesError) {
        console.error("Error fetching notes:", notesError);
      }

      // Fetch recent activity logs
      const { data: activityData, error: activityError } = await supabase
        .from("activity_logs")
        .select("buyer_id, created_at")
        .in("buyer_id", buyerIds)
        .gte("created_at", twentyFourHoursAgo);

      if (activityError) {
        console.error("Error fetching activity logs:", activityError);
      }

      // Build stats map
      const statsMap: Record<string, BuyerActivityStats> = {};

      // Initialize all buyers
      buyerIds.forEach(id => {
        statsMap[id] = {
          buyer_id: id,
          uploads_count: 0,
          has_notes: false,
          last_activity_at: null,
          has_recent_activity: false
        };
      });

      // Count uploads and track timestamps
      (uploadsData || []).forEach(upload => {
        if (upload.buyer_id && statsMap[upload.buyer_id]) {
          statsMap[upload.buyer_id].uploads_count++;
          
          // Track latest activity
          const uploadTime = upload.created_at;
          if (!statsMap[upload.buyer_id].last_activity_at || 
              uploadTime > statsMap[upload.buyer_id].last_activity_at!) {
            statsMap[upload.buyer_id].last_activity_at = uploadTime;
          }

          // Check if recent
          if (uploadTime >= twentyFourHoursAgo) {
            statsMap[upload.buyer_id].has_recent_activity = true;
          }
        }
      });

      // Check notes
      (notesData || []).forEach(noteRecord => {
        if (noteRecord.buyer_id && statsMap[noteRecord.buyer_id] && noteRecord.note?.trim()) {
          statsMap[noteRecord.buyer_id].has_notes = true;

          // Track latest activity from notes
          const noteTime = noteRecord.updated_at;
          if (noteTime && (!statsMap[noteRecord.buyer_id].last_activity_at || 
              noteTime > statsMap[noteRecord.buyer_id].last_activity_at!)) {
            statsMap[noteRecord.buyer_id].last_activity_at = noteTime;
          }

          // Check if recent note update
          if (noteTime && noteTime >= twentyFourHoursAgo) {
            statsMap[noteRecord.buyer_id].has_recent_activity = true;
          }
        }
      });

      // Check activity logs for recent activity
      (activityData || []).forEach(activity => {
        if (activity.buyer_id && statsMap[activity.buyer_id]) {
          statsMap[activity.buyer_id].has_recent_activity = true;

          const activityTime = activity.created_at;
          if (!statsMap[activity.buyer_id].last_activity_at || 
              activityTime > statsMap[activity.buyer_id].last_activity_at!) {
            statsMap[activity.buyer_id].last_activity_at = activityTime;
          }
        }
      });

      return statsMap;
    },
    enabled: buyerIds.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
