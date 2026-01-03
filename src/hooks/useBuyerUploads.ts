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
}

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

      const { data, error } = await supabase
        .from("buyer_uploads")
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching buyer uploads:", error);
        return [];
      }

      return data as BuyerUpload[];
    },
    enabled: !!buyerId && !!propertyId,
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      caption,
      buyerPropertyId,
    }: {
      file: File;
      caption?: string;
      buyerPropertyId?: string;
    }) => {
      if (!buyerId || !propertyId) {
        throw new Error("Missing buyer or property ID");
      }

      const fileType = getFileType(file.type);
      const fileName = generateFileName(file.name);
      const storagePath = `${buyerId}/${propertyId}/${fileType}s/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("buyer-uploads")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("שגיאה בהעלאת הקובץ");
      }

      // Get signed URL (private bucket)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("buyer-uploads")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

      if (signedUrlError) {
        console.error("Signed URL error:", signedUrlError);
        throw new Error("שגיאה ביצירת קישור לקובץ");
      }

      // Insert record
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
        })
        .select()
        .single();

      if (insertError) {
        // Try to delete the uploaded file if insert fails
        await supabase.storage.from("buyer-uploads").remove([storagePath]);
        console.error("Insert error:", insertError);
        throw new Error("שגיאה בשמירת פרטי הקובץ");
      }

      // Log activity (anonymous - no file details exposed)
      await supabase.from("activity_logs").insert({
        buyer_id: buyerId,
        action_type: "file_uploaded",
        description: "הלקוח הוסיף מדיה ליומן האישי שלו",
        metadata: { property_id: propertyId },
      });

      return data as BuyerUpload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-uploads", buyerId, propertyId] });
      toast.success("הקובץ הועלה בהצלחה");
    },
    onError: (error: Error) => {
      toast.error(error.message || "שגיאה בהעלאת הקובץ");
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (upload: BuyerUpload) => {
      if (!buyerId) {
        throw new Error("Missing buyer ID");
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("buyer-uploads")
        .remove([upload.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue anyway - the file might already be gone
      }

      // Delete record
      const { error: deleteError } = await supabase
        .from("buyer_uploads")
        .delete()
        .eq("id", upload.id)
        .eq("buyer_id", buyerId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error("שגיאה במחיקת הקובץ");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-uploads", buyerId, propertyId] });
      toast.success("הקובץ נמחק בהצלחה");
    },
    onError: (error: Error) => {
      toast.error(error.message || "שגיאה במחיקת הקובץ");
    },
  });

  // Refresh signed URLs for existing uploads
  const refreshSignedUrls = async (uploads: BuyerUpload[]): Promise<BuyerUpload[]> => {
    const refreshedUploads: BuyerUpload[] = [];

    for (const upload of uploads) {
      const { data: signedUrlData, error } = await supabase.storage
        .from("buyer-uploads")
        .createSignedUrl(upload.storage_path, 60 * 60 * 24); // 24 hours

      if (error) {
        console.error("Error refreshing signed URL:", error);
        refreshedUploads.push(upload);
      } else {
        refreshedUploads.push({
          ...upload,
          file_url: signedUrlData.signedUrl,
        });
      }
    }

    return refreshedUploads;
  };

  return {
    uploads: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    uploadFile: uploadMutation.mutate,
    deleteFile: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refreshSignedUrls,
  };
}
