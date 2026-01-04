import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Filter, Save, X, MapPin } from "lucide-react";
import { useNeighborhoods } from "@/hooks/useNeighborhoods";
import { formatPrice } from "@/lib/formatPrice";

interface BuyerFilters {
  budget_min: number | null;
  budget_max: number | null;
  target_budget: number | null;
  min_rooms: number | null;
  target_cities: string[] | null;
  target_neighborhoods: string[] | null;
  required_features: string[] | null;
  floor_min: number | null;
  floor_max: number | null;
  property_types: string[] | null;
  min_plot_size: number | null;
}

interface BuyerFiltersModalProps {
  buyerId: string;
  buyerName: string;
  initialFilters: BuyerFilters;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const AVAILABLE_CITIES = [
  "רחובות",
  "נס ציונה",
  "מזכרת בתיה",
  "יבנה",
  "ראשון לציון",
  "תל אביב",
  "גבעתיים",
  "רמת גן",
  "בת ים",
  "חולון",
  "פתח תקווה",
  "הרצליה",
  "רעננה",
  "כפר סבא",
  "נתניה",
  "אשדוד",
  "באר שבע",
  "ירושלים",
  "חיפה",
];

const REQUIRED_FEATURES_OPTIONS = [
  { value: "parking_spots", label: "חניה" },
  { value: "has_safe_room", label: "ממ\"ד" },
  { value: "has_elevator", label: "מעלית" },
  { value: "has_sun_balcony", label: "מרפסת שמש" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "דירה" },
  { value: "penthouse", label: "פנטהאוז" },
  { value: "private_house", label: "בית פרטי" },
  { value: "semi_detached", label: "דו משפחתי" },
];

export const BuyerFiltersModal = ({
  buyerId,
  buyerName,
  initialFilters,
  open,
  onOpenChange,
  onSaved,
}: BuyerFiltersModalProps) => {
  const [filters, setFilters] = useState<BuyerFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [cityInput, setCityInput] = useState("");
  
  // Use merged neighborhoods (static + admin additions)
  const { neighborhoodsByCity } = useNeighborhoods();

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters, open]);

  // Clean up neighborhoods when city is removed
  useEffect(() => {
    if (!filters.target_neighborhoods || filters.target_neighborhoods.length === 0) return;
    if (!filters.target_cities || filters.target_cities.length === 0) {
      setFilters(prev => ({ ...prev, target_neighborhoods: [] }));
      return;
    }

    // Get valid neighborhoods for selected cities from merged dictionary
    const validNeighborhoods = filters.target_cities.flatMap(city => 
      neighborhoodsByCity[city] || []
    );

    // Remove neighborhoods that are no longer valid
    const filteredNeighborhoods = filters.target_neighborhoods.filter(n => 
      validNeighborhoods.includes(n)
    );

    if (filteredNeighborhoods.length !== filters.target_neighborhoods.length) {
      setFilters(prev => ({ ...prev, target_neighborhoods: filteredNeighborhoods }));
    }
  }, [filters.target_cities, neighborhoodsByCity]);

  const handleSave = async () => {
    // Validation
    if (filters.budget_min && filters.budget_max && filters.budget_min >= filters.budget_max) {
      toast.error("תקציב מינימום חייב להיות קטן מתקציב מקסימום");
      return;
    }

    if (filters.floor_min && filters.floor_max && filters.floor_min > filters.floor_max) {
      toast.error("קומה מינימלית חייבת להיות קטנה או שווה לקומה מקסימלית");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("buyers")
        .update({
          budget_min: filters.budget_min,
          budget_max: filters.budget_max,
          target_budget: filters.target_budget,
          min_rooms: filters.min_rooms,
          target_cities: filters.target_cities,
          target_neighborhoods: filters.target_neighborhoods,
          required_features: filters.required_features,
          floor_min: filters.floor_min,
          floor_max: filters.floor_max,
          property_types: filters.property_types,
          min_plot_size: filters.min_plot_size,
        })
        .eq("id", buyerId);

      if (error) throw error;

      // Trigger real-time matching after filter update
      try {
        await supabase.functions.invoke("trigger-matching", {
          body: { 
            type: "buyer_filter_change", 
            record: { id: buyerId } 
          },
        });
      } catch (triggerError) {
        console.error("Error triggering matching:", triggerError);
        // Don't fail the save if trigger fails
      }

      toast.success("הפילטרים נשמרו בהצלחה - מחשב התאמות...");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving filters:", error);
      toast.error("שגיאה בשמירת הפילטרים");
    } finally {
      setLoading(false);
    }
  };

  const toggleCity = (city: string) => {
    const currentCities = filters.target_cities || [];
    if (currentCities.includes(city)) {
      setFilters({
        ...filters,
        target_cities: currentCities.filter((c) => c !== city),
      });
    } else {
      setFilters({
        ...filters,
        target_cities: [...currentCities, city],
      });
    }
  };

  const addCustomCity = () => {
    if (!cityInput.trim()) return;
    const currentCities = filters.target_cities || [];
    if (!currentCities.includes(cityInput.trim())) {
      setFilters({
        ...filters,
        target_cities: [...currentCities, cityInput.trim()],
      });
    }
    setCityInput("");
  };

  const toggleFeature = (feature: string) => {
    const currentFeatures = filters.required_features || [];
    if (currentFeatures.includes(feature)) {
      setFilters({
        ...filters,
        required_features: currentFeatures.filter((f) => f !== feature),
      });
    } else {
      setFilters({
        ...filters,
        required_features: [...currentFeatures, feature],
      });
    }
  };

  const toggleNeighborhood = (neighborhood: string) => {
    const currentNeighborhoods = filters.target_neighborhoods || [];
    if (currentNeighborhoods.includes(neighborhood)) {
      setFilters({
        ...filters,
        target_neighborhoods: currentNeighborhoods.filter((n) => n !== neighborhood),
      });
    } else {
      setFilters({
        ...filters,
        target_neighborhoods: [...currentNeighborhoods, neighborhood],
      });
    }
  };

  const togglePropertyType = (type: string) => {
    const currentTypes = filters.property_types || [];
    if (currentTypes.includes(type)) {
      setFilters({
        ...filters,
        property_types: currentTypes.filter((t) => t !== type),
      });
    } else {
      setFilters({
        ...filters,
        property_types: [...currentTypes, type],
      });
    }
  };

  // Check if house types are selected to show plot size filter
  const hasHouseTypes = filters.property_types?.some(t => t === "private_house" || t === "semi_detached") || false;

  // Get selected cities that have neighborhoods in the merged dictionary
  const selectedCitiesWithNeighborhoods = filters.target_cities?.filter(city => 
    neighborhoodsByCity[city]?.length > 0
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            עריכת פילטרים קשיחים - {buyerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Budget Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">1. תקציב יעד (₪)</Label>
            <div className="max-w-xs">
              <Input
                id="target_budget"
                type="number"
                value={filters.target_budget || ""}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setFilters({
                    ...filters,
                    target_budget: value,
                    // Auto-calculate ±20% range
                    budget_min: value ? Math.round(value * 0.8) : null,
                    budget_max: value ? Math.round(value * 1.2) : null,
                  });
                }}
                placeholder="לדוגמה: 2000000"
                dir="ltr"
              />
            </div>
            {filters.target_budget && (
              <p className="text-sm text-muted-foreground">
                טווח חיפוש: {formatPrice(Math.round(filters.target_budget * 0.8))} - {formatPrice(Math.round(filters.target_budget * 1.2))}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              * המערכת תחפש בטווח גמיש של ±20% מהתקציב שהוגדר
            </p>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">2. מיקום רצוי (ערים)</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CITIES.map((city) => (
                <Badge
                  key={city}
                  variant={filters.target_cities?.includes(city) ? "default" : "outline"}
                  className="cursor-pointer transition-colors hover:bg-primary/80"
                  onClick={() => toggleCity(city)}
                >
                  {city}
                  {filters.target_cities?.includes(city) && (
                    <X className="w-3 h-3 mr-1" />
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="הוסף עיר נוספת..."
                onKeyDown={(e) => e.key === "Enter" && addCustomCity()}
              />
              <Button type="button" variant="outline" onClick={addCustomCity}>
                הוסף
              </Button>
            </div>
            {filters.target_cities && filters.target_cities.length > 0 && (
              <p className="text-xs text-muted-foreground">
                נבחרו: {filters.target_cities.join(", ")}
              </p>
            )}
          </div>

          {/* Neighborhoods Section - Only show if cities are selected */}
          {filters.target_cities && filters.target_cities.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                6. שכונות רצויות (תלויות עיר)
              </Label>
              
              {selectedCitiesWithNeighborhoods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  אין שכונות מוגדרות לערים שנבחרו
                </p>
              ) : selectedCitiesWithNeighborhoods.length === 1 ? (
                // Single city - show flat list
                <div className="flex flex-wrap gap-2">
                  {neighborhoodsByCity[selectedCitiesWithNeighborhoods[0]]?.map((neighborhood) => (
                    <Badge
                      key={neighborhood}
                      variant={filters.target_neighborhoods?.includes(neighborhood) ? "default" : "outline"}
                      className="cursor-pointer transition-colors hover:bg-primary/80"
                      onClick={() => toggleNeighborhood(neighborhood)}
                    >
                      {neighborhood}
                      {filters.target_neighborhoods?.includes(neighborhood) && (
                        <X className="w-3 h-3 mr-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                // Multiple cities - show tabs
                <Tabs defaultValue={selectedCitiesWithNeighborhoods[0]} className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    {selectedCitiesWithNeighborhoods.map((city) => (
                      <TabsTrigger key={city} value={city} className="text-sm">
                        {city}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {selectedCitiesWithNeighborhoods.map((city) => (
                    <TabsContent key={city} value={city} className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {neighborhoodsByCity[city]?.map((neighborhood) => (
                          <Badge
                            key={neighborhood}
                            variant={filters.target_neighborhoods?.includes(neighborhood) ? "default" : "outline"}
                            className="cursor-pointer transition-colors hover:bg-primary/80"
                            onClick={() => toggleNeighborhood(neighborhood)}
                          >
                            {neighborhood}
                            {filters.target_neighborhoods?.includes(neighborhood) && (
                              <X className="w-3 h-3 mr-1" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
              
              {filters.target_neighborhoods && filters.target_neighborhoods.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  שכונות נבחרות: {filters.target_neighborhoods.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Required Features Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">3. מאפיינים קשיחים (חובה)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {REQUIRED_FEATURES_OPTIONS.map((feature) => (
                <div
                  key={feature.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg transition-colors min-h-[48px] ${
                    filters.required_features?.includes(feature.value)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id={`feature-${feature.value}`}
                    checked={filters.required_features?.includes(feature.value) || false}
                    onCheckedChange={() => toggleFeature(feature.value)}
                    className="h-5 w-5"
                  />
                  <Label 
                    htmlFor={`feature-${feature.value}`}
                    className="cursor-pointer text-sm flex-1"
                  >
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              * נכסים ללא המאפיינים שנבחרו יסוננו מתוצאות החיפוש
            </p>
          </div>

          {/* Rooms Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">4. חדרי מגורים</Label>
            <div className="w-48">
              <Label htmlFor="min_rooms" className="text-sm text-muted-foreground">
                מינימום חדרים
              </Label>
              <Input
                id="min_rooms"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={filters.min_rooms || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    min_rooms: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="לדוגמה: 3"
                dir="ltr"
              />
            </div>
          </div>

          {/* Floor Range Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">5. טווח קומות</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="floor_min" className="text-sm text-muted-foreground">
                  קומה מינימלית
                </Label>
                <Input
                  id="floor_min"
                  type="number"
                  value={filters.floor_min || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      floor_min: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="לדוגמה: 2"
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="floor_max" className="text-sm text-muted-foreground">
                  קומה מקסימלית
                </Label>
                <Input
                  id="floor_max"
                  type="number"
                  value={filters.floor_max || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      floor_max: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="לדוגמה: 10"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Property Types Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">6. סוג נכס</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PROPERTY_TYPE_OPTIONS.map((type) => (
                <div
                  key={type.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    filters.property_types?.includes(type.value)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => togglePropertyType(type.value)}
                >
                  <Checkbox
                    checked={filters.property_types?.includes(type.value) || false}
                    onCheckedChange={() => togglePropertyType(type.value)}
                  />
                  <Label className="cursor-pointer text-sm">{type.label}</Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              * אם לא נבחר סוג, יוצגו כל סוגי הנכסים
            </p>
          </div>

          {/* Minimum Plot Size - Only for houses */}
          {hasHouseTypes && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">7. גודל מגרש מינימלי (מ״ר)</Label>
              <div className="w-48">
                <Input
                  id="min_plot_size"
                  type="number"
                  min={0}
                  value={filters.min_plot_size || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      min_plot_size: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="לדוגמה: 200"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                * רלוונטי רק לבתים פרטיים ודו-משפחתיים
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            <Save className="w-4 h-4 ml-2" />
            {loading ? "שומר..." : "שמור קריטריונים"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const hasFiltersConfigured = (buyer: {
  budget_min?: number | null;
  budget_max?: number | null;
  min_rooms?: number | null;
  target_cities?: string[] | null;
  target_neighborhoods?: string[] | null;
  required_features?: string[] | null;
  floor_min?: number | null;
  floor_max?: number | null;
}): boolean => {
  return !!(
    buyer.budget_min ||
    buyer.budget_max ||
    buyer.min_rooms ||
    (buyer.target_cities && buyer.target_cities.length > 0) ||
    (buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0) ||
    (buyer.required_features && buyer.required_features.length > 0) ||
    buyer.floor_min ||
    buyer.floor_max
  );
};
