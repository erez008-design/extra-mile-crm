import { useState, useMemo } from "react";
import { CalendarClock, Phone, MessageCircle, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBuyers, BuyerData } from "@/hooks/useBuyers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isPast, isTomorrow, addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { he } from "date-fns/locale";

interface BuyerWithFollowUp extends BuyerData {
  follow_up_date: string | null;
  follow_up_note: string | null;
  last_contact_date: string | null;
}

export default function FollowUps() {
  const { data: buyers = [], isLoading } = useBuyers();

  // Cast buyers to include follow-up fields
  const buyersWithFollowUp = buyers as BuyerWithFollowUp[];

  // Filter buyers with follow-up dates
  const buyersWithDates = useMemo(() => {
    return buyersWithFollowUp
      .filter(b => b.follow_up_date)
      .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime());
  }, [buyersWithFollowUp]);

  // Group by status
  const overdueFollowUps = useMemo(() => {
    return buyersWithDates.filter(b => {
      const date = new Date(b.follow_up_date!);
      return isPast(date) && !isToday(date);
    });
  }, [buyersWithDates]);

  const todayFollowUps = useMemo(() => {
    return buyersWithDates.filter(b => isToday(new Date(b.follow_up_date!)));
  }, [buyersWithDates]);

  const upcomingFollowUps = useMemo(() => {
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const weekEnd = endOfDay(addDays(new Date(), 7));
    return buyersWithDates.filter(b => {
      const date = new Date(b.follow_up_date!);
      return isWithinInterval(date, { start: tomorrow, end: weekEnd });
    });
  }, [buyersWithDates]);

  const handleSendWhatsApp = async (buyer: BuyerWithFollowUp) => {
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;
    
    let phone = buyer.phone?.replace(/\D/g, "") || "";
    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }
    
    const message = `היי ${buyer.full_name}, רציתי לבדוק איך ההתקדמות בחיפוש הדירה? יש לי כמה נכסים חדשים שאולי יתאימו לך: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_logs").insert({
        buyer_id: buyer.id,
        agent_id: user?.id || null,
        action_type: "whatsapp_sent" as any,
        description: "נשלחה הודעת WhatsApp (פולואפ)",
        metadata: { phone, share_url: shareUrl, type: "follow_up" }
      });
      
      // Update last_contact_date
      await supabase
        .from("buyers")
        .update({ last_contact_date: new Date().toISOString() })
        .eq("id", buyer.id);
    } catch (error) {
      console.error("Failed to log WhatsApp activity:", error);
    }
    
    window.open(whatsappUrl, "_blank");
  };

  const markAsComplete = async (buyer: BuyerWithFollowUp) => {
    try {
      await supabase
        .from("buyers")
        .update({ 
          follow_up_date: null,
          follow_up_note: null,
          last_contact_date: new Date().toISOString()
        })
        .eq("id", buyer.id);
      
      toast({ title: "הפולואפ סומן כהושלם" });
    } catch (error) {
      toast({ title: "שגיאה", variant: "destructive" });
    }
  };

  const FollowUpCard = ({ buyer, variant }: { buyer: BuyerWithFollowUp; variant: "overdue" | "today" | "upcoming" }) => {
    const borderColor = variant === "overdue" ? "border-destructive/50" : variant === "today" ? "border-orange-500/50" : "border-border";
    const bgColor = variant === "overdue" ? "bg-destructive/5" : variant === "today" ? "bg-orange-500/5" : "";
    
    return (
      <Card className={`${borderColor} ${bgColor} transition-all hover:shadow-md`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {buyer.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{buyer.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{buyer.phone}</p>
                </div>
              </div>
              {buyer.follow_up_note && (
                <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                  {buyer.follow_up_note}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {format(new Date(buyer.follow_up_date!), "EEEE, d בMMMM", { locale: he })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                onClick={() => handleSendWhatsApp(buyer)}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => markAsComplete(buyer)}
              >
                <CheckCircle className="h-4 w-4" />
                הושלם
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">פולואפים</h1>
            <p className="mt-1 text-muted-foreground">טוען...</p>
          </div>
          <TableSkeleton columns={4} rows={6} />
        </div>
      </DashboardLayout>
    );
  }

  const totalFollowUps = overdueFollowUps.length + todayFollowUps.length + upcomingFollowUps.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">פולואפים</h1>
            <p className="mt-1 text-muted-foreground">
              {totalFollowUps} פולואפים מתוזמנים
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={overdueFollowUps.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{overdueFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">עברו תאריך</p>
              </div>
            </CardContent>
          </Card>
          <Card className={todayFollowUps.length > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{todayFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">להיום</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">לשבוע הקרוב</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {totalFollowUps === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="אין פולואפים מתוזמנים"
            description="הוסף תאריכי פולואפ לקונים דרך כרטיס הקונה"
          />
        ) : (
          <div className="space-y-6">
            {/* Overdue Section */}
            {overdueFollowUps.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  עברו תאריך ({overdueFollowUps.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overdueFollowUps.map(buyer => (
                    <FollowUpCard key={buyer.id} buyer={buyer} variant="overdue" />
                  ))}
                </div>
              </div>
            )}

            {/* Today Section */}
            {todayFollowUps.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-orange-500 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  להיום ({todayFollowUps.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayFollowUps.map(buyer => (
                    <FollowUpCard key={buyer.id} buyer={buyer} variant="today" />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Section */}
            {upcomingFollowUps.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  לשבוע הקרוב ({upcomingFollowUps.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingFollowUps.map(buyer => (
                    <FollowUpCard key={buyer.id} buyer={buyer} variant="upcoming" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
