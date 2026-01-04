import { useState, useEffect } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppBannerProps {
  variant?: "banner" | "button";
  className?: string;
}

export const InstallAppBanner = ({ variant = "banner", className }: InstallAppBannerProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSTooltip, setShowIOSTooltip] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if user dismissed banner before
    const dismissedBefore = localStorage.getItem("install_banner_dismissed");
    if (dismissedBefore) {
      setDismissed(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTooltip(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("install_banner_dismissed", "true");
  };

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;

  // Don't show if not on mobile or no prompt available (for non-iOS)
  if (!isIOS && !deferredPrompt) return null;

  if (variant === "button") {
    return (
      <div className={cn("relative", className)}>
        <Button
          onClick={handleInstallClick}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">התקן אפליקציה</span>
        </Button>

        {/* iOS Tooltip */}
        {showIOSTooltip && isIOS && (
          <div className="absolute top-full left-0 mt-2 p-4 bg-card border rounded-lg shadow-lg z-50 w-72" dir="rtl">
            <button 
              onClick={() => setShowIOSTooltip(false)}
              className="absolute top-2 left-2 p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Share className="w-5 h-5 text-primary" />
              <span className="font-medium">התקנה באייפון</span>
            </div>
            <p className="text-sm text-muted-foreground">
              לחץ על כפתור השיתוף בסרגל הניווט, גלול למטה ובחר "הוסף למסך הבית"
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3",
        className
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">התקן את האפליקציה</p>
          <p className="text-xs text-muted-foreground">גישה מהירה מהמסך הראשי</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="gap-1.5"
        >
          <Download className="w-4 h-4" />
          התקן
        </Button>
        <button 
          onClick={handleDismiss}
          className="p-1.5 hover:bg-muted rounded"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* iOS Tooltip */}
      {showIOSTooltip && isIOS && (
        <div className="absolute inset-x-4 top-full mt-2 p-4 bg-card border rounded-lg shadow-lg z-50" dir="rtl">
          <button 
            onClick={() => setShowIOSTooltip(false)}
            className="absolute top-2 left-2 p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Share className="w-5 h-5 text-primary" />
            <span className="font-medium">התקנה באייפון</span>
          </div>
          <p className="text-sm text-muted-foreground">
            לחץ על כפתור השיתוף בסרגל הניווט, גלול למטה ובחר "הוסף למסך הבית"
          </p>
        </div>
      )}
    </div>
  );
};

export default InstallAppBanner;
