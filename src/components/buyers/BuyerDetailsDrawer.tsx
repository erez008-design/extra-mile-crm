import { useState } from "react";
import {
  Building2,
  MapPin,
  Maximize,
  Phone,
  Calendar,
  Home,
  DollarSign,
  Layers,
  Shield,
  CircleParking,
  Compass,
  Sun,
  MessageSquare,
  Save,
  X,
  History,
  Link,
  Sparkles,
  Plus,
  MessageCircle,
} from "lucide-react";
import { BuyerData } from "@/hooks/useBuyers";
import { supabase } from "@/integrations/supabase/client";
import { useOfferedProperties, useUpdateAgentFeedback, OfferedProperty } from "@/hooks/useOfferedProperties";
import { formatPrice } from "@/lib/formatPrice";
import { safeDateDisplay } from "@/lib/safeDate";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ActivityTimeline } from "./ActivityTimeline";

interface BuyerDetailsDrawerProps {
  buyer: BuyerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  has_safe_room: { label: 'ממ"ד', icon: <Shield className="h-4 w-4" /> },
  has_elevator: { label: "מעלית", icon: <Layers className="h-4 w-4" /> },
  has_sun_balcony: { label: "מרפסת שמש", icon: <Sun className="h-4 w-4" /> },
  parking_spots: { label: "חניה", icon: <CircleParking className="h-4 w-4" /> },
};

export function BuyerDetailsDrawer({ buyer, open, onOpenChange }: BuyerDetailsDrawerProps) {
  const { data: offeredProperties = [], isLoading } = useOfferedProperties(open ? (buyer?.id ?? null) : null);
  const { toast } = useToast();

  if (!buyer) return null;

  // פונקציית העתקת קישור שמותאמת לאייפון
  const handleCopyLink = async () => {
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "הקישור הועתק",
        description: "הקישור מוכן לשליחה ועובד גם באייפון",
      });
    } catch (err) {
      toast({ title: "שגיאה בהעתקת הקישור", variant: "destructive" });
    }
  };

  // פונקציה לשליחת וואטסאפ עם רישום פעילות
  const handleSendWhatsApp = async () => {
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;
    
    // ניקוי מספר הטלפון והוספת קידומת ישראל
    let phone = buyer.phone?.replace(/\D/g, "") || "";
    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }
    
    const message = `היי ${buyer.full_name}, הכנתי עבורך רשימת נכסים חדשים שמתאימים לדרישות שלך. אפשר לראות את כל הפרטים והתמונות כאן: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // Log activity to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_logs").insert({
        buyer_id: buyer.id,
        agent_id: user?.id || null,
        action_type: "whatsapp_sent" as any,
        description: "נשלחה הודעת WhatsApp עם קישור לנכסים",
        metadata: { phone, share_url: shareUrl }
      });
    } catch (error) {
      console.error("Failed to log WhatsApp activity:", error);
    }
    
    window.open(whatsappUrl, "_blank");
  };

  const getBudgetDisplay = () => {
    if (buyer.target_budget) {
      const min = Math.round(buyer.target_budget * 0.8);
      const max = Math.round(buyer.target_budget * 1.2);
      return {
        target: formatPrice(buyer.target_budget),
        range: `${formatPrice(min)} - ${formatPrice(max)}`,
      };
    }
    if (buyer.budget_min || buyer.budget_max) {
      return {
        target: null,
        range: `${formatPrice(buyer.budget_min)} - ${formatPrice(buyer.budget_max)}`,
      };
    }
    return null;
  };

  const budgetDisplay = getBudgetDisplay();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg font-semibold text-primary">
                    {buyer.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold">{buyer.full_name}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{buyer.phone || "אין טלפון"}</p>
                </div>
              </div>

              {/* כפתורי פעולה מהירים בראש ה-Drawer */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
                  <Link className="h-4 w-4" />
                  העתק קישור
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSendWhatsApp} 
                  className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  שלח בוואטסאפ
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-accent/30 text-accent">
                  <Sparkles className="h-4 w-4" />
                  מצא נכסים
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="details" className="px-6 py-3">
              דרישות חיפוש
            </TabsTrigger>
            <TabsTrigger value="offered" className="px-6 py-3">
              נכסים שהוצעו ({offeredProperties.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="px-6 py-3">
              <History className="h-4 w-4 ml-1" />
              פעילות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0">
            <ScrollArea className="h-[calc(100vh-180px)] p-6">
              <div className="space-y-6">
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      דרישות חיפוש
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">תקציב</p>
                        {budgetDisplay ? (
                          <div>
                            {budgetDisplay.target && <p className="text-lg font-bold">{budgetDisplay.target}</p>}
                            <p className="text-sm text-muted-foreground">טווח: {budgetDisplay.range}</p>
                          </div>
                        ) : (
                          <p className="text-sm">לא צוין</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Home className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">מינימום חדרים</p>
                        <p className="text-lg font-bold">{buyer.min_rooms ? `${buyer.min_rooms}+` : "לא צוין"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">דרישות חובה</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(FEATURE_LABELS).map(([key, { label, icon }]) => {
                        const isRequired = buyer.required_features?.includes(key);
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-lg border ${isRequired ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 text-muted-foreground"}`}
                          >
                            {icon}
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {buyer.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">הערות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{buyer.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="offered" className="mt-0">
            <ScrollArea className="h-[calc(100vh-180px)] p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : offeredProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-semibold">אין נכסים שהוצעו</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {offeredProperties.map((offered) => (
                    <OfferedPropertyCard key={offered.id} offered={offered} buyerId={buyer.id} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="p-6">
              <ActivityTimeline buyerId={buyer.id} />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function OfferedPropertyCard({ offered, buyerId }: { offered: OfferedProperty; buyerId: string }) {
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState(offered.agent_feedback || "");
  const { toast } = useToast();
  const updateFeedback = useUpdateAgentFeedback();

  const property = offered.property;
  const primaryImage = property.images?.find((img: any) => img.is_primary) || property.images?.[0];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "offered":
        return <Badge variant="secondary">הוצע</Badge>;
      case "interested":
        return <Badge className="bg-emerald-500 text-white">מעוניין</Badge>;
      case "not_interested":
        return <Badge variant="destructive">לא מעוניין</Badge>;
      case "visited":
        return <Badge className="bg-blue-500 text-white">ביקר</Badge>;
      default:
        return <Badge variant="outline">{status || "הוצע"}</Badge>;
    }
  };

  const handleSaveFeedback = async () => {
    try {
      await updateFeedback.mutateAsync({
        offeredPropertyId: offered.id,
        buyerId,
        feedback,
      });
      toast({ title: "הערה נשמרה" });
      setShowFeedbackInput(false);
    } catch (error) {
      toast({ title: "שגיאה", variant: "destructive" });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
          {primaryImage ? (
            <img src={primaryImage.url} alt={property.address} className="h-full w-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Building2 className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-1">{property.address}</h3>
            {getStatusBadge(offered.status)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{property.city}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {property.rooms && <span>{property.rooms} חדרים</span>}
            </div>
            <span className="text-sm font-bold text-primary">{formatPrice(property.price)}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 bg-muted/30">
        {showFeedbackInput ? (
          <div className="space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="כתוב הערה פנימית..."
              className="text-sm min-h-[80px]"
              dir="rtl"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowFeedbackInput(false)}>
                <X className="h-4 w-4 ml-1" />
                ביטול
              </Button>
              <Button size="sm" onClick={handleSaveFeedback} disabled={updateFeedback.isPending}>
                שמור
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setShowFeedbackInput(true)}>
            <MessageSquare className="h-4 w-4 ml-1" />
            {offered.agent_feedback ? "ערוך הערת סוכן" : "הוסף הערת סוכן"}
          </Button>
        )}
      </div>
    </Card>
  );
}
