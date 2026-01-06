import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BuyerUpload {
  id: string;
  buyer_id: string;
  property_id: string;
  buyer_property_id: string | null;
  file_url: string;
  file_name: string;
  file_type: "image" | "video" | "document";
  file_size_bytes: number | null;
  mime_type: string | null;
  caption: string | null;
  storage_path: string;
  created_at: string;
  is_private: boolean;
  shared_with_agent: boolean;
}

// 100MB max file size
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Get file type from MIME type
function getFileType(mimeType: string): "image" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

// Generate unique file name
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop() || "";
  const baseName = originalName.replace(/\.[^/.]+$/, "").substring(0, 50);
  return `${baseName}-${timestamp}-${random}.${extension}`;
}

export function useBuyerUploads(buyerId: string | undefined, propertyId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch uploads for this buyer/property
  const query = useQuery({
    queryKey: ["buyer-uploads", buyerId, propertyId],
    queryFn: async () => {
      if (!buyerId || !propertyId) return [];

      console.log("[BuyerUploads] Fetching uploads for buyerId:", buyerId, "propertyId:", propertyId);

      const { data, error } = await supabase
        .from("buyer_uploads")
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[BuyerUploads] Error fetching uploads:", error);
        return [];
      }

      console.log("[BuyerUploads] Fetched", data?.length || 0, "uploads");

      // Refresh signed URLs for all uploads
      const uploadsWithFreshUrls: BuyerUpload[] = [];
      for (const upload of data || []) {
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from("buyer-uploads")
          .createSignedUrl(upload.storage_path, 60 * 60); // 1 hour

        if (signedError) {
          console.error("[BuyerUploads] Error creating signed URL:", signedError);
          uploadsWithFreshUrls.push(upload as BuyerUpload);
        } else {
          uploadsWithFreshUrls.push({
            ...upload,
            file_url: signedUrlData.signedUrl,
          } as BuyerUpload);
        }
      }

      return uploadsWithFreshUrls;
    },
    enabled: !!buyerId && !!propertyId,
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      caption,
      buyerPropertyId,
      sharedWithAgent = false,
    }: {
      file: File;
      caption?: string;
      buyerPropertyId?: string;
      sharedWithAgent?: boolean;
    }) => {
      if (!buyerId || !propertyId) {
        throw new Error("Missing buyer or property ID");
      }

      console.log("[BuyerUploads] Starting upload for buyerId:", buyerId, "file:", file.name, "size:", file.size);

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("הקובץ גדול מדי (מקסימום 100MB)");
      }

      const fileType = getFileType(file.type);
      const fileName = generateFileName(file.name);
      const storagePath = `${buyerId}/${propertyId}/${fileType}s/${fileName}`;

      console.log("[BuyerUploads] Uploading to storage path:", storagePath);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("buyer-uploads")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("[BuyerUploads] Storage upload error:", uploadError);
        throw new Error("שגיאה בהעלאת הקובץ: " + uploadError.message);
      }

      console.log("[BuyerUploads] Storage upload successful, creating signed URL...");

      // Get signed URL (private bucket)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("buyer-uploads")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

      if (signedUrlError) {
        console.error("[BuyerUploads] Signed URL error:", signedUrlError);
        // Clean up uploaded file
        await supabase.storage.from("buyer-uploads").remove([storagePath]);
        throw new Error("שגיאה ביצירת קישור לקובץ");
      }

      console.log("[BuyerUploads] Inserting record into buyer_uploads table...");

      // Insert record with privacy fields
      const { data, error: insertError } = await supabase
        .from("buyer_uploads")
        .insert({
          buyer_id: buyerId,
          property_id: propertyId,
          buyer_property_id: buyerPropertyId || null,
          file_url: signedUrlData.signedUrl,
          file_name: file.name,
          file_type: fileType,
          file_size_bytes: file.size,
          mime_type: file.type,
          caption: caption || null,
          storage_path: storagePath,
          is_private: true,
          shared_with_agent: sharedWithAgent,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[BuyerUploads] Insert error:", insertError);
        // Try to delete the uploaded file if insert fails
        await supabase.storage.from("buyer-uploads").remove([storagePath]);
        throw new Error("שגיאה בשמירת פרטי הקובץ: " + insertError.message);
      }

      console.log("[BuyerUploads] Record inserted successfully:", data.id);

      // Log activity (anonymous - no file details exposed)
      try {
        await supabase.from("activity_logs").insert({
          buyer_id: buyerId,
          action_type: "file_uploaded",
          description: "הלקוח הוסיף מדיה ליומן האישי שלו",
          metadata: { property_id: propertyId },
        });
      } catch (logError) {
        console.error("[BuyerUploads] Activity log error (non-critical):", logError);
      }

      return data as BuyerUpload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-uploads", buyerId, propertyId] });
      toast.success("הקובץ הועלה בהצלחה");
    },
    onError: (error: Error) => {
      console.error("[BuyerUploads] Upload mutation error:", error);
      toast.error(error.message || "שגיאה בהעלאת הקובץ");
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (upload: BuyerUpload) => {
      if (!buyerId) {
        throw new Error("Missing buyer ID");
      }

      console.log("[BuyerUploads] Deleting upload:", upload.id, "for buyerId:", buyerId);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("buyer-uploads")
        .remove([upload.storage_path]);

      if (storageError) {
        console.error("[BuyerUploads] Storage delete error:", storageError);
        // Continue anyway - the file might already be gone
      }

      // Delete record
      const { error: deleteError } = await supabase
        .from("buyer_uploads")
        .delete()
        .eq("id", upload.id)
        .eq("buyer_id", buyerId);

      if (deleteError) {
        console.error("[BuyerUploads] Delete error:", deleteError);
        throw new Error("שגיאה במחיקת הקובץ: " + deleteError.message);
      }

      console.log("[BuyerUploads] Delete successful");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-uploads", buyerId, propertyId] });
      toast.success("הקובץ נמחק בהצלחה");
    },
    onError: (error: Error) => {
      console.error("[BuyerUploads] Delete mutation error:", error);
      toast.error(error.message || "שגיאה במחיקת הקובץ");
    },
  });

  return {
    uploads: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    uploadFile: uploadMutation.mutate,
    deleteFile: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
