import { useState } from "react";
import { Building2, MapPin, Maximize, Phone, Calendar, Home, DollarSign, Layers, Shield, CircleParking, Compass, Sun, MessageSquare, Save, X } from "lucide-react";
import { BuyerData } from "@/hooks/useBuyers";
import { useOfferedProperties, useUpdateAgentFeedback, OfferedProperty } from "@/hooks/useOfferedProperties";
import { formatPrice } from "@/lib/formatPrice";
import { safeDateDisplay } from "@/lib/safeDate";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface BuyerDetailsDrawerProps {
  buyer: BuyerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  has_safe_room: { label: "ממ\"ד", icon: <Shield className="h-4 w-4" /> },
  has_elevator: { label: "מעלית", icon: <Layers className="h-4 w-4" /> },
  has_sun_balcony: { label: "מרפסת שמש", icon: <Sun className="h-4 w-4" /> },
  parking_spots: { label: "חניה", icon: <CircleParking className="h-4 w-4" /> },
};

export function BuyerDetailsDrawer({ buyer, open, onOpenChange }: BuyerDetailsDrawerProps) {
  const { data: offeredProperties = [], isLoading } = useOfferedProperties(open ? buyer?.id ?? null : null);

  if (!buyer) return null;

  // Calculate budget range for display (±20% from target_budget)
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
      <SheetContent side="left" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
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
              {buyer.phone && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Phone className="h-3 w-3" />
                  {buyer.phone}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              דרישות חיפוש
            </TabsTrigger>
            <TabsTrigger
              value="offered"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              נכסים שהוצעו ({offeredProperties.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)] p-6">
              <div className="space-y-6">
                {/* Search Requirements Card */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      דרישות חיפוש
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Budget */}
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">תקציב</p>
                        {budgetDisplay ? (
                          <div>
                            {budgetDisplay.target && (
                              <p className="text-lg font-bold text-foreground">
                                {budgetDisplay.target}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              טווח חיפוש: {budgetDisplay.range}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">לא צוין</p>
                        )}
                      </div>
                    </div>

                    {/* Rooms */}
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Home className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">מינימום חדרים</p>
                        <p className="text-lg font-bold text-foreground">
                          {buyer.min_rooms ? `${buyer.min_rooms}+` : "לא צוין"}
                        </p>
                      </div>
                    </div>

                    {/* Floor */}
                    {(buyer.floor_min !== null || buyer.floor_max !== null) && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Layers className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">קומה</p>
                          <p className="text-lg font-bold text-foreground">
                            {buyer.floor_min ?? 0} - {buyer.floor_max ?? "∞"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Must-Have Features Card */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">דרישות חובה (Must-Have)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(FEATURE_LABELS).map(([key, { label, icon }]) => {
                        const isRequired = buyer.required_features?.includes(key);
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                              isRequired
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-muted/30 border-border text-muted-foreground"
                            }`}
                          >
                            {icon}
                            <span className="text-sm font-medium">{label}</span>
                            {isRequired && (
                              <Badge variant="secondary" className="mr-auto text-xs">
                                חובה
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Location Card */}
                {((buyer.target_cities && buyer.target_cities.length > 0) ||
                  (buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0)) && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        מיקום רצוי
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Cities */}
                      {buyer.target_cities && buyer.target_cities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">ערים</p>
                          <div className="flex flex-wrap gap-2">
                            {buyer.target_cities.map((city) => (
                              <Badge key={city} variant="secondary">
                                {city}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Neighborhoods */}
                      {buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">שכונות</p>
                          <div className="flex flex-wrap gap-2">
                            {buyer.target_neighborhoods.map((neighborhood) => (
                              <Badge key={neighborhood} variant="outline">
                                {neighborhood}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {buyer.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">הערות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{buyer.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Created at */}
                {buyer.created_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    נוצר: {safeDateDisplay(buyer.created_at, (d) => format(d, "dd/MM/yyyy"))}
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="offered" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)] p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">טוען נכסים...</p>
                </div>
              ) : offeredProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-semibold">אין נכסים שהוצעו</h3>
                  <p className="mt-2 text-muted-foreground">
                    השתמש בהתאמה חכמה כדי להציע נכסים לקונה זה
                  </p>
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
        return <Badge className="bg-emerald-500">מעוניין</Badge>;
      case "not_interested":
        return <Badge variant="destructive">לא מעוניין</Badge>;
      case "visited":
        return <Badge className="bg-blue-500">ביקר</Badge>;
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
      toast({
        title: "הערה נשמרה",
        description: "הערת הסוכן נשמרה בהצלחה",
      });
      setShowFeedbackInput(false);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את ההערה",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={property.address}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Building2 className="h-8 w-8 text-primary/20" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-1">{property.address}</h3>
            {getStatusBadge(offered.status)}
          </div>
          
          <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            {property.city}
            {property.neighborhood && ` • ${property.neighborhood}`}
          </p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {property.rooms && <span>{property.rooms} חדרים</span>}
              {property.size_sqm && (
                <span className="flex items-center gap-1">
                  <Maximize className="h-3 w-3" />
                  {property.size_sqm} מ״ר
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-primary">
              {formatPrice(property.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Agent Feedback Section */}
      <div className="border-t border-border px-4 py-3 bg-muted/30">
        {showFeedbackInput ? (
          <div className="space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="כתוב הערה פנימית על הנכס (למשל: הלקוח אהב את המיקום אבל לא אהב את המטבח הקטן)"
              className="text-sm min-h-[80px] resize-none"
              dir="rtl"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFeedbackInput(false);
                  setFeedback(offered.agent_feedback || "");
                }}
              >
                <X className="h-4 w-4 ml-1" />
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={handleSaveFeedback}
                disabled={updateFeedback.isPending}
              >
                {updateFeedback.isPending ? (
                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 ml-1" />
                )}
                שמור
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {offered.agent_feedback ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  הערת סוכן:
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{offered.agent_feedback}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowFeedbackInput(true)}
                >
                  ערוך הערה
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full justify-center"
                onClick={() => setShowFeedbackInput(true)}
              >
                <MessageSquare className="h-4 w-4 ml-1" />
                הוסף הערת סוכן
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
