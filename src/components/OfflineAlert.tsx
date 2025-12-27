import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const OfflineAlert = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4" dir="rtl">
      <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-2xl flex items-center justify-center gap-3 text-sm font-bold border-2 border-white/20">
        <WifiOff className="h-5 w-5 animate-pulse" />
        <span>אין חיבור לאינטרנט - נתונים לא יישמרו</span>
      </div>
    </div>
  );
};
