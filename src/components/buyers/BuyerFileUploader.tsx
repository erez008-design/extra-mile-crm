import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Video, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BuyerFileUploaderProps {
  onUpload: (file: File, caption?: string) => void;
  isUploading: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
];

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <Image className="w-8 h-8 text-primary" />;
  if (file.type.startsWith("video/")) return <Video className="w-8 h-8 text-primary" />;
  return <FileText className="w-8 h-8 text-primary" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function BuyerFileUploader({ onUpload, isUploading }: BuyerFileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!ALL_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("סוג קובץ לא נתמך. נסה תמונה, וידאו או מסמך.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("הקובץ גדול מדי. גודל מקסימלי: 50MB");
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [validateFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;
    onUpload(selectedFile, caption || undefined);
    setSelectedFile(null);
    setCaption("");
    setPreview(null);
  }, [selectedFile, caption, onUpload]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setCaption("");
    setPreview(null);
  }, []);

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleInputChange}
              accept={ALL_ACCEPTED_TYPES.join(",")}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">גרור ושחרר קובץ כאן</p>
              <p className="text-xs text-muted-foreground mb-3">או לחץ לבחירת קובץ</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" /> תמונות
                </span>
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" /> וידאו
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> מסמכים
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">מקסימום 50MB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Preview */}
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg flex-shrink-0">
                  {getFileIcon(selectedFile)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={clearSelection}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Caption Input */}
            <div className="space-y-2">
              <Label htmlFor="caption" className="text-sm">
                תיאור (אופציונלי)
              </Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="הוסף תיאור לקובץ..."
                disabled={isUploading}
              />
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מעלה...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  העלה קובץ
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
