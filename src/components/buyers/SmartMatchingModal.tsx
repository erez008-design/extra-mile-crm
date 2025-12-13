import { Building2, MapPin, Maximize, X, Sparkles, Check } from "lucide-react";
import { BuyerData } from "@/hooks/useBuyers";
import { MatchedProperty, usePropertyMatching } from "@/hooks/usePropertyMatching";
import { formatPrice } from "@/lib/formatPrice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface SmartMatchingModalProps {
  buyer: BuyerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmartMatchingModal({ buyer, open, onOpenChange }: SmartMatchingModalProps) {
  const { data: matchedProperties = [], isLoading } = usePropertyMatching(open ? buyer : null);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-orange-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">התאמה חכמה</DialogTitle>
                {buyer && (
                  <p className="text-sm text-muted-foreground mt-1">
                    נכסים מתאימים עבור: <span className="font-medium text-foreground">{buyer.full_name}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6" style={{ maxHeight: "calc(85vh - 100px)" }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">מחפש נכסים מתאימים...</p>
            </div>
          ) : matchedProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">לא נמצאו נכסים מתאימים</h3>
              <p className="mt-2 text-muted-foreground max-w-md">
                לא נמצאו נכסים שמתאימים לדרישות הקונה. נסה לעדכן את הפרמטרים או להוסיף נכסים חדשים למערכת.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  נמצאו <span className="font-bold text-foreground">{matchedProperties.length}</span> נכסים מתאימים
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {matchedProperties.map((property) => (
                  <PropertyMatchCard key={property.id} property={property} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PropertyMatchCard({ property }: { property: MatchedProperty }) {
  const primaryImage = property.images.find((img) => img.is_primary) || property.images[0];

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-orange-500";
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={property.address}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-primary/20" />
          </div>
        )}
        
        {/* Match Score Badge */}
        <div className="absolute top-2 left-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-primary-foreground ${getScoreColor(property.matchScore)}`}>
            <Sparkles className="h-3 w-3" />
            {property.matchScore}%
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1">{property.address}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          {property.city}
          {property.neighborhood && ` • ${property.neighborhood}`}
        </p>

        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          {property.rooms && <span>{property.rooms} חדרים</span>}
          {property.size_sqm && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3 w-3" />
              {property.size_sqm} מ״ר
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-lg font-bold text-primary">
            {formatPrice(property.price)}
          </span>
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {property.matchReasons.slice(0, 2).map((reason, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                <Check className="h-2.5 w-2.5" />
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
