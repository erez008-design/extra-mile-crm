import { Building2, MapPin, Maximize, Phone, User, Calendar, Sparkles } from "lucide-react";
import { BuyerData } from "@/hooks/useBuyers";
import { useOfferedProperties } from "@/hooks/useOfferedProperties";
import { formatPrice } from "@/lib/formatPrice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BuyerDetailsDrawerProps {
  buyer: BuyerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyerDetailsDrawer({ buyer, open, onOpenChange }: BuyerDetailsDrawerProps) {
  const { data: offeredProperties = [], isLoading } = useOfferedProperties(open ? buyer?.id ?? null : null);

  if (!buyer) return null;

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
              פרטים
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
                {/* Budget */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">תקציב</h4>
                  <p className="text-lg font-semibold">
                    {buyer.budget_min || buyer.budget_max
                      ? `${formatPrice(buyer.budget_min)} - ${formatPrice(buyer.budget_max)}`
                      : "לא צוין"}
                  </p>
                </div>

                {/* Rooms */}
                {buyer.min_rooms && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">חדרים</h4>
                    <p className="text-lg font-semibold">{buyer.min_rooms}+</p>
                  </div>
                )}

                {/* Floor */}
                {(buyer.floor_min !== null || buyer.floor_max !== null) && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">קומה</h4>
                    <p className="text-lg font-semibold">
                      {buyer.floor_min !== null ? buyer.floor_min : "0"} - {buyer.floor_max !== null ? buyer.floor_max : "∞"}
                    </p>
                  </div>
                )}

                {/* Target Cities */}
                {buyer.target_cities && buyer.target_cities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">ערים</h4>
                    <div className="flex flex-wrap gap-2">
                      {buyer.target_cities.map((city) => (
                        <Badge key={city} variant="secondary">
                          {city}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Neighborhoods */}
                {buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">שכונות</h4>
                    <div className="flex flex-wrap gap-2">
                      {buyer.target_neighborhoods.map((neighborhood) => (
                        <Badge key={neighborhood} variant="outline">
                          {neighborhood}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Features */}
                {buyer.required_features && buyer.required_features.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">דרישות מיוחדות</h4>
                    <div className="flex flex-wrap gap-2">
                      {buyer.required_features.map((feature) => (
                        <Badge key={feature} className="bg-accent/20 text-accent">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {buyer.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">הערות</h4>
                    <p className="text-sm text-foreground">{buyer.notes}</p>
                  </div>
                )}

                {/* Created at */}
                {buyer.created_at && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">נוצר בתאריך</h4>
                    <p className="flex items-center gap-1 text-sm text-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(buyer.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
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
                    <OfferedPropertyCard key={offered.id} offered={offered} />
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

function OfferedPropertyCard({ offered }: { offered: any }) {
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
    </Card>
  );
}
