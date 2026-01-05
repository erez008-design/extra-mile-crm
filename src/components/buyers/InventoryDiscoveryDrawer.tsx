import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Building2, Info, MapPin, Home, Ruler, Banknote, Images as ImagesIcon } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { PropertyLightbox } from "./PropertyLightbox";

interface InventoryProperty {
  id: string;
  address: string;
  city: string;
  neighborhood: string | null;
  price: number | null;
  rooms: number | null;
  size_sqm: number | null;
  property_type: string | null;
  agent_id: string | null;
  property_images: { url: string; is_primary: boolean }[];
}

interface InventoryDiscoveryDrawerProps {
  buyerId: string;
  buyerAgentId: string | null;
  excludedPropertyIds?: string[];
}

export function InventoryDiscoveryDrawer({
  buyerId,
  buyerAgentId,
  excludedPropertyIds = [],
}: InventoryDiscoveryDrawerProps) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<InventoryProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          address,
          city,
          neighborhood,
          price,
          rooms,
          size_sqm,
          property_type,
          agent_id,
          property_images (url, is_primary)
        `)
        .neq("status", "sold")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out properties already offered to this buyer
      const filtered = (data || []).filter(
        (p) => !excludedPropertyIds.includes(p.id)
      );
      setProperties(filtered);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("שגיאה בטעינת המלאי");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInventory();
    }
  }, [open]);

  const handleRequestInfo = async (property: InventoryProperty) => {
    setRequestingId(property.id);
    try {
      const agentId = property.agent_id || buyerAgentId;

      if (!agentId) {
        toast.error("לא נמצא סוכן לנכס זה");
        return;
      }

      // 1. Insert notification
      const { error: notifError } = await supabase.from("notifications").insert({
        buyer_id: buyerId,
        agent_id: agentId,
        property_id: property.id,
        match_score: 100, // Manual request = high priority
        match_reason: "בקשת מידע ישירה מהקונה",
        is_read_by_agent: false,
        is_read_by_manager: false,
      });

      if (notifError) throw notifError;

      // 2. Log activity
      await supabase.from("activity_logs").insert({
        buyer_id: buyerId,
        agent_id: agentId,
        action_type: "property_saved" as any, // Using property_saved as closest match
        description: `קונה ביקש מידע על נכס: ${property.address}, ${property.city}`,
        metadata: { 
          property_id: property.id,
          source: "inventory_discovery"
        }
      });

      toast.success("בקשתך נשלחה לסוכן בהצלחה!");
    } catch (error) {
      console.error("Error requesting info:", error);
      toast.error("שגיאה בשליחת הבקשה");
    } finally {
      setRequestingId(null);
    }
  };

  const filteredProperties = properties.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.address.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query) ||
      (p.neighborhood?.toLowerCase().includes(query) ?? false)
    );
  });

  const getPrimaryImage = (property: InventoryProperty) => {
    const primary = property.property_images?.find((img) => img.is_primary);
    return primary?.url || property.property_images?.[0]?.url || null;
  };

  const openLightbox = (property: InventoryProperty) => {
    const images = property.property_images?.map(img => img.url) || [];
    if (images.length > 0) {
      setLightbox({ 
        images, 
        index: 0, 
        title: `${property.address}, ${property.city}` 
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Building2 className="w-4 h-4" />
            גלה עוד נכסים
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0" dir="rtl">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              מלאי נכסים
              <Badge variant="secondary">{properties.length} נכסים</Badge>
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי כתובת, עיר או שכונה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>לא נמצאו נכסים</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredProperties.map((property) => {
                  const imageUrl = getPrimaryImage(property);
                  const imageCount = property.property_images?.length || 0;

                  return (
                    <div
                      key={property.id}
                      className="flex gap-3 p-3 border rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      {/* Property Image */}
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={property.address}
                              className="w-full h-full object-cover"
                            />
                            {/* Gallery icon */}
                            {imageCount > 1 && (
                              <button
                                onClick={() => openLightbox(property)}
                                className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-md hover:bg-black/80 transition-colors"
                              >
                                <ImagesIcon className="w-3 h-3" />
                              </button>
                            )}
                            <Badge className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5">
                              {imageCount}
                            </Badge>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{property.address}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                          {property.neighborhood && `, ${property.neighborhood}`}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          {property.rooms && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Home className="w-3 h-3" />
                              {property.rooms} חד׳
                            </span>
                          )}
                          {property.size_sqm && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Ruler className="w-3 h-3" />
                              {property.size_sqm} מ״ר
                            </span>
                          )}
                        </div>

                        {property.price && (
                          <p className="text-sm font-semibold mt-1 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5" />
                            {formatPrice(property.price)}
                          </p>
                        )}

                        {/* Request Info Button */}
                        <Button
                          size="sm"
                          variant="default"
                          className="mt-2 gap-1.5 h-8 text-xs rounded-lg"
                          onClick={() => handleRequestInfo(property)}
                          disabled={requestingId === property.id}
                        >
                          <Info className="w-3.5 h-3.5" />
                          {requestingId === property.id ? "שולח..." : "בקש מידע"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      {lightbox && (
        <PropertyLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          open={!!lightbox}
          onOpenChange={(open) => !open && setLightbox(null)}
          title={lightbox.title}
        />
      )}
    </>
  );
}
