import { useState, useEffect } from "react";
import { Download, X, Share, Smartphone, MoreVertical } from "lucide-react";
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
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // Check if running on Android
    const android = /Android/i.test(navigator.userAgent);
    setIsAndroid(android);

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
    // Show platform-specific instructions
    if (isIOS || (isAndroid && !deferredPrompt)) {
      setShowTooltip(true);
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

  // Show for mobile users or if prompt is available
  const isMobile = isIOS || isAndroid;
  if (!isMobile && !deferredPrompt) return null;

  // Platform-specific tooltip content
  const tooltipContent = isIOS ? (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Share className="w-5 h-5 text-primary" />
        <span className="font-medium">התקנה באייפון</span>
      </div>
      <p className="text-sm text-muted-foreground">
        לחץ על כפתור השיתוף בסרגל הניווט, גלול למטה ובחר "הוסף למסך הבית"
      </p>
    </>
  ) : (
    <>
      <div className="flex items-center gap-2 mb-2">
        <MoreVertical className="w-5 h-5 text-primary" />
        <span className="font-medium">התקנה באנדרואיד</span>
      </div>
      <p className="text-sm text-muted-foreground">
        לחץ על שלוש הנקודות בפינה העליונה ובחר "הוסף למסך הבית" או "התקן אפליקציה"
      </p>
    </>
  );

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

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 p-4 bg-card border rounded-lg shadow-lg z-50 w-72" dir="rtl">
            <button 
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 left-2 p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
            {tooltipContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3 relative",
        className
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-sm">
          <img 
            src="/icons/extramile-logo-source.jpg" 
            alt="EXTRAMILE" 
            className="w-8 h-8 object-contain"
          />
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

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute inset-x-4 top-full mt-2 p-4 bg-card border rounded-lg shadow-lg z-50" dir="rtl">
          <button 
            onClick={() => setShowTooltip(false)}
            className="absolute top-2 left-2 p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4" />
          </button>
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default InstallAppBanner;
