import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BuyerFileUploader } from "./BuyerFileUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lock, Share2 } from "lucide-react";
import { useBuyerUploads } from "@/hooks/useBuyerUploads";

interface QuickUploadModalProps {
  buyerId: string;
  propertyId: string;
  buyerPropertyId?: string;
  propertyAddress?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function QuickUploadModal({
  buyerId,
  propertyId,
  buyerPropertyId,
  propertyAddress,
  open,
  onOpenChange,
  onUploadComplete,
}: QuickUploadModalProps) {
  const [shareWithAgent, setShareWithAgent] = useState(false);
  const { uploadFile, isUploading } = useBuyerUploads(buyerId, propertyId);

  const handleUpload = (file: File, caption?: string) => {
    uploadFile(
      { file, caption, buyerPropertyId, sharedWithAgent: shareWithAgent },
      {
        onSuccess: () => {
          setShareWithAgent(false);
          onOpenChange(false);
          onUploadComplete?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            העלאה מהירה
          </DialogTitle>
          {propertyAddress && (
            <p className="text-sm text-muted-foreground">{propertyAddress}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Privacy Notice */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Lock className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm text-primary">
              קובץ זה פרטי ונראה רק לך
            </p>
          </div>

          {/* File Uploader */}
          <BuyerFileUploader onUpload={handleUpload} isUploading={isUploading} />

          {/* Share with Agent Option */}
          <div className="flex items-start space-x-3 space-x-reverse p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="share-with-agent"
              checked={shareWithAgent}
              onCheckedChange={(checked) => setShareWithAgent(checked === true)}
            />
            <div className="flex-1">
              <Label
                htmlFor="share-with-agent"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                שתף עם הסוכן שלי
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                הסוכן יוכל לראות את הקובץ הזה כדי לעזור לך למצוא התאמות טובות יותר
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
