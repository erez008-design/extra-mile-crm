import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Building, Car, Home, Bath, Info } from "lucide-react";
import { 
  useGetExtendedProperty, 
  useUpsertExtendedProperty,
  PropertyExtendedDetailsInsert 
} from "@/hooks/usePropertyExtendedDetails";

interface Property {
  id: string;
  address: string;
  city: string;
  rooms: number | null;
  price: number;
}

export function AdminPropertyExtendedDetails() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState<Omit<PropertyExtendedDetailsInsert, 'property_id'>>({
    floor: null,
    total_floors: null,
    has_elevator: null,
    elevators_count: null,
    parking_count: null,
    parking_covered: null,
    has_storage: null,
    storage_size_sqm: null,
    balcony_size_sqm: null,
    renovation_level: null,
    bathrooms: null,
    toilets: null,
    building_year: null,
    air_directions: null,
  });

  const { data: extendedData, isLoading: loadingExtended } = useGetExtendedProperty(selectedPropertyId);
  const upsertMutation = useUpsertExtendedProperty();

  // Load properties on mount
  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, rooms, price")
        .order("created_at", { ascending: false });

      if (data) {
        setProperties(data);
      }
      setLoadingProperties(false);
    };

    fetchProperties();
  }, []);

  // Update form when extended data loads
  useEffect(() => {
    if (extendedData) {
      setFormData({
        floor: extendedData.floor,
        total_floors: extendedData.total_floors,
        has_elevator: extendedData.has_elevator,
        elevators_count: extendedData.elevators_count,
        parking_count: extendedData.parking_count,
        parking_covered: extendedData.parking_covered,
        has_storage: extendedData.has_storage,
        storage_size_sqm: extendedData.storage_size_sqm,
        balcony_size_sqm: extendedData.balcony_size_sqm,
        renovation_level: extendedData.renovation_level,
        bathrooms: extendedData.bathrooms,
        toilets: extendedData.toilets,
        building_year: extendedData.building_year,
        air_directions: extendedData.air_directions,
      });
    } else if (selectedPropertyId) {
      // Reset form for new property
      setFormData({
        floor: null,
        total_floors: null,
        has_elevator: null,
        elevators_count: null,
        parking_count: null,
        parking_covered: null,
        has_storage: null,
        storage_size_sqm: null,
        balcony_size_sqm: null,
        renovation_level: null,
        bathrooms: null,
        toilets: null,
        building_year: null,
        air_directions: null,
      });
    }
  }, [extendedData, selectedPropertyId]);

  const handleSave = async () => {
    if (!selectedPropertyId) {
      toast.error("יש לבחור נכס לפני השמירה");
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        property_id: selectedPropertyId,
        ...formData,
      });
      toast.success("הנתונים נשמרו בהצלחה");
    } catch (error: any) {
      console.error("Error saving extended details:", error);
      toast.error("שגיאה בשמירת הנתונים");
    }
  };

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-muted-foreground" />
            <CardDescription className="text-base">
              כאן ניתן להוסיף נתונים טכניים לנכסים כדי לשפר את השוואת הנכסים עבור הלקוחות.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Property Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">בחירת נכס</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedPropertyId} 
            onValueChange={setSelectedPropertyId}
            disabled={loadingProperties}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingProperties ? "טוען נכסים..." : "בחר נכס לעריכה"} />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.address} – {property.rooms || '?'} חדרים – ₪{property.price?.toLocaleString() || 0}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedProperty && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-medium">{selectedProperty.address}</span>
              <span className="text-muted-foreground"> • {selectedProperty.city}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Sections - Only show when property is selected */}
      {selectedPropertyId && (
        <>
          {loadingExtended ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Building & Structure */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">מבנה והנדסה</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="floor">קומה</Label>
                      <Input
                        id="floor"
                        type="number"
                        value={formData.floor ?? ""}
                        onChange={(e) => updateField("floor", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_floors">סה״כ קומות בבניין</Label>
                      <Input
                        id="total_floors"
                        type="number"
                        value={formData.total_floors ?? ""}
                        onChange={(e) => updateField("total_floors", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="building_year">שנת בנייה</Label>
                      <Input
                        id="building_year"
                        type="number"
                        value={formData.building_year ?? ""}
                        onChange={(e) => updateField("building_year", e.target.value ? Number(e.target.value) : null)}
                        placeholder="1990"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="has_elevator" className="cursor-pointer">יש מעלית</Label>
                      <Switch
                        id="has_elevator"
                        checked={formData.has_elevator ?? false}
                        onCheckedChange={(checked) => updateField("has_elevator", checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="elevators_count">מספר מעליות</Label>
                      <Input
                        id="elevators_count"
                        type="number"
                        value={formData.elevators_count ?? ""}
                        onChange={(e) => updateField("elevators_count", e.target.value ? Number(e.target.value) : null)}
                        placeholder="1"
                        disabled={!formData.has_elevator}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>כיווני אוויר</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "north", label: "צפון" },
                          { value: "south", label: "דרום" },
                          { value: "east", label: "מזרח" },
                          { value: "west", label: "מערב" },
                          { value: "northeast", label: "צפון-מזרח" },
                          { value: "northwest", label: "צפון-מערב" },
                          { value: "southeast", label: "דרום-מזרח" },
                          { value: "southwest", label: "דרום-מערב" },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(formData.air_directions || []).includes(opt.value)}
                              onChange={(e) => {
                                const current = formData.air_directions || [];
                                if (e.target.checked) {
                                  updateField("air_directions", [...current, opt.value]);
                                } else {
                                  updateField("air_directions", current.filter(d => d !== opt.value));
                                }
                              }}
                              className="w-4 h-4 rounded border-input"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parking & Storage */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">חניה ואחסון</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parking_count">מספר חניות</Label>
                      <Input
                        id="parking_count"
                        type="number"
                        value={formData.parking_count ?? ""}
                        onChange={(e) => updateField("parking_count", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="parking_covered" className="cursor-pointer">חניה מקורה</Label>
                      <Switch
                        id="parking_covered"
                        checked={formData.parking_covered ?? false}
                        onCheckedChange={(checked) => updateField("parking_covered", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="has_storage" className="cursor-pointer">יש מחסן</Label>
                      <Switch
                        id="has_storage"
                        checked={formData.has_storage ?? false}
                        onCheckedChange={(checked) => updateField("has_storage", checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storage_size_sqm">גודל מחסן (מ״ר)</Label>
                      <Input
                        id="storage_size_sqm"
                        type="number"
                        step="0.1"
                        value={formData.storage_size_sqm ?? ""}
                        onChange={(e) => updateField("storage_size_sqm", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                        disabled={!formData.has_storage}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Balcony & Renovation */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">מרפסת ושיפוץ</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="balcony_size_sqm">גודל מרפסת (מ״ר)</Label>
                      <Input
                        id="balcony_size_sqm"
                        type="number"
                        step="0.1"
                        value={formData.balcony_size_sqm ?? ""}
                        onChange={(e) => updateField("balcony_size_sqm", e.target.value ? Number(e.target.value) : null)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="renovation_level">רמת שיפוץ</Label>
                      <Select 
                        value={formData.renovation_level ?? ""} 
                        onValueChange={(value) => updateField("renovation_level", value as any || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר רמת שיפוץ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">חדש</SelectItem>
                          <SelectItem value="renovated">משופץ</SelectItem>
                          <SelectItem value="needs_renovation">דרוש שיפוץ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bathrooms & Toilets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">חדרי רחצה ושירותים</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">מספר חדרי רחצה</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms ?? ""}
                        onChange={(e) => updateField("bathrooms", e.target.value ? Number(e.target.value) : null)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="toilets">מספר שירותים</Label>
                      <Input
                        id="toilets"
                        type="number"
                        value={formData.toilets ?? ""}
                        onChange={(e) => updateField("toilets", e.target.value ? Number(e.target.value) : null)}
                        placeholder="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={upsertMutation.isPending}
                  size="lg"
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  שמור נתונים טכניים
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
