import { useState, useEffect } from "react";
import { Download, Smartphone, Share, Plus, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
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
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen-safe bg-background flex items-center justify-center p-4 safe-all">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>האפליקציה מותקנת!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              האפליקציה מותקנת על המכשיר שלך ומוכנה לשימוש.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-background flex items-center justify-center p-4 safe-all" dir="rtl">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-medium bg-white flex items-center justify-center p-2">
            <img 
              src="/icons/extramile-logo-source.jpg" 
              alt="EXTRAMILE" 
              className="w-full h-full object-contain" 
            />
          </div>
          <CardTitle className="text-xl">התקן את EXTRAMILE</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            התקן את האפליקציה על המכשיר שלך לגישה מהירה ונוחה יותר
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isIOS ? (
            <div className="space-y-4">
              <p className="text-sm text-center font-medium">
                כדי להתקין ב-iPhone או iPad:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Share className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">1.</span> לחץ על כפתור השיתוף
                    <span className="text-muted-foreground"> בסרגל הניווט</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">2.</span> גלול למטה בתפריט
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">3.</span> בחר "הוסף למסך הבית"
                  </div>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button 
              onClick={handleInstallClick} 
              size="lg" 
              className="w-full gap-2 touch-target"
            >
              <Download className="w-5 h-5" />
              התקן עכשיו
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                פתח דף זה בדפדפן Chrome או Safari במכשיר הנייד שלך כדי להתקין את האפליקציה
              </p>
            </div>
          )}

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              האפליקציה תפעל גם ללא חיבור לאינטרנט ותיטען מהר יותר
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
