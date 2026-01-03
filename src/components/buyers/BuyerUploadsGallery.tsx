import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Image,
  Video,
  FileText,
  Trash2,
  Download,
  Play,
  Eye,
  Loader2,
  Calendar,
} from "lucide-react";
import { BuyerUpload } from "@/hooks/useBuyerUploads";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface BuyerUploadsGalleryProps {
  uploads: BuyerUpload[];
  onDelete: (upload: BuyerUpload) => void;
  isDeleting: boolean;
  isLoading: boolean;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "image":
      return <Image className="w-5 h-5" />;
    case "video":
      return <Video className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
}

function getFileTypeBadge(fileType: string) {
  switch (fileType) {
    case "image":
      return <Badge variant="secondary">תמונה</Badge>;
    case "video":
      return <Badge variant="secondary">וידאו</Badge>;
    default:
      return <Badge variant="secondary">מסמך</Badge>;
  }
}

export function BuyerUploadsGallery({
  uploads,
  onDelete,
  isDeleting,
  isLoading,
}: BuyerUploadsGalleryProps) {
  const [selectedUpload, setSelectedUpload] = useState<BuyerUpload | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = uploads.filter((u) => u.file_type === "image");
  const videos = uploads.filter((u) => u.file_type === "video");
  const documents = uploads.filter((u) => u.file_type === "document");

  const openLightbox = (upload: BuyerUpload) => {
    setSelectedUpload(upload);
    setLightboxOpen(true);
  };

  const handleDownload = (upload: BuyerUpload) => {
    const link = document.createElement("a");
    link.href = upload.file_url;
    link.download = upload.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">עדיין לא העלית קבצים</p>
        <p className="text-xs mt-1">העלה תמונות, וידאו או מסמכים באמצעות הטופס למעלה</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Images Grid */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Image className="w-4 h-4" />
            תמונות ({images.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((upload) => (
              <div
                key={upload.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => openLightbox(upload)}
              >
                <img
                  src={upload.file_url}
                  alt={upload.file_name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <DeleteButton
                  upload={upload}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos List */}
      {videos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Video className="w-4 h-4" />
            וידאו ({videos.length})
          </h4>
          <div className="space-y-2">
            {videos.map((upload) => (
              <Card key={upload.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-20 h-14 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => openLightbox(upload)}
                    >
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.file_name}</p>
                      {upload.caption && (
                        <p className="text-xs text-muted-foreground truncate">
                          {upload.caption}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(upload.created_at), "d בMMMM yyyy", { locale: he })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(upload)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <DeleteButtonInline
                        upload={upload}
                        onDelete={onDelete}
                        isDeleting={isDeleting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            מסמכים ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((upload) => (
              <Card key={upload.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.file_name}</p>
                      {upload.caption && (
                        <p className="text-xs text-muted-foreground truncate">
                          {upload.caption}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(upload.created_at), "d בMMMM yyyy", { locale: he })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(upload)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <DeleteButtonInline
                        upload={upload}
                        onDelete={onDelete}
                        isDeleting={isDeleting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-right">{selectedUpload?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {selectedUpload?.file_type === "image" && (
              <img
                src={selectedUpload.file_url}
                alt={selectedUpload.file_name}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {selectedUpload?.file_type === "video" && (
              <video
                src={selectedUpload.file_url}
                controls
                className="w-full max-h-[70vh] rounded-lg"
              />
            )}
            {selectedUpload?.caption && (
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedUpload.caption}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Delete button for image grid (overlay)
function DeleteButton({
  upload,
  onDelete,
  isDeleting,
}: {
  upload: BuyerUpload;
  onDelete: (upload: BuyerUpload) => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">מחיקת קובץ</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            האם אתה בטוח שברצונך למחוק את הקובץ "{upload.file_name}"? פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(upload)}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Delete button for list items
function DeleteButtonInline({
  upload,
  onDelete,
  isDeleting,
}: {
  upload: BuyerUpload;
  onDelete: (upload: BuyerUpload) => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">מחיקת קובץ</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            האם אתה בטוח שברצונך למחוק את הקובץ "{upload.file_name}"? פעולה זו לא ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(upload)}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
