import { Bell, Check, CheckCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeIsraeliPhone } from "@/lib/phoneUtils";
import { toast } from "sonner";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read_by_agent) {
      markAsRead.mutate(notification.id);
    }
    navigate(`/property/${notification.property_id}`);
  };

  const handleWhatsAppReply = async (e: React.MouseEvent, notification: typeof notifications[0]) => {
    e.stopPropagation();
    
    try {
      // Fetch buyer phone
      const { data: buyer } = await supabase
        .from("buyers")
        .select("phone, full_name")
        .eq("id", notification.buyer_id)
        .single();

      if (!buyer?.phone) {
        toast.error("לא נמצא מספר טלפון לקונה");
        return;
      }

      // Sanitize and format phone for WhatsApp
      const sanitized = sanitizeIsraeliPhone(buyer.phone);
      const whatsappPhone = sanitized.replace(/^0/, "972");

      // Build message with buyer name and property address
      const propertyInfo = notification.property 
        ? `${notification.property.address}, ${notification.property.city}`
        : "הנכס שביקשת";
      
      const message = encodeURIComponent(
        `שלום ${buyer.full_name},\nקיבלתי את בקשתך לגבי ${propertyInfo}. אשמח לעזור! 🏠`
      );

      // Open WhatsApp
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");

      // Mark as read
      if (!notification.is_read_by_agent) {
        markAsRead.mutate(notification.id);
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("שגיאה בפתיחת וואטסאפ");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">התראות</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              className="text-xs gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              אין התראות חדשות
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.is_read_by_agent ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    {!notification.is_read_by_agent && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {notification.match_score}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: he,
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        התאמה חדשה עבור {notification.buyer?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.property?.address}, {notification.property?.city}
                      </p>
                      {notification.match_reason && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.match_reason}
                        </p>
                      )}
                      
                      {/* WhatsApp Reply Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1.5 h-7 text-xs rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        onClick={(e) => handleWhatsAppReply(e, notification)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        השב בוואטסאפ
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
