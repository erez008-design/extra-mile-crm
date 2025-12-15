import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditPropertyModalProps {
  property: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const RENOVATION_STATUS_OPTIONS = [
  { value: "new", label: "חדש מקבלן" },
  { value: "renovated", label: "משופץ" },
  { value: "good", label: "במצב טוב" },
  { value: "needs_renovation", label: "לשיפוץ" },
];

const AIR_DIRECTION_OPTIONS = [
  { value: "north", label: "צפון" },
  { value: "south", label: "דרום" },
  { value: "east", label: "מזרח" },
  { value: "west", label: "מערב" },
  { value: "northeast", label: "צפון-מזרח" },
  { value: "northwest", label: "צפון-מערב" },
  { value: "southeast", label: "דרום-מזרח" },
  { value: "southwest", label: "דרום-מערב" },
];

const PARKING_TYPE_OPTIONS = [
  { value: "tabu", label: "רשומה בטאבו" },
  { value: "shared", label: "חניה משותפת" },
  { value: "covered", label: "מקורה" },
  { value: "open", label: "פתוחה" },
  { value: "tandem", label: "עוקבת (טורית)" },
  { value: "double", label: "כפולה / מכפיל" },
];

export function EditPropertyModal({ property, open, onOpenChange, onSaved }: EditPropertyModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    price: "",
    size_sqm: "",
    rooms: "",
    floor: "",
    total_floors: "",
    air_directions: [] as string[],
    renovation_status: "",
    build_year: "",
    parking_spots: "",
    has_elevator: false,
    has_balcony: false,
    has_safe_room: false,
    has_sun_balcony: false,
    description: "",
    // Extended details
    balcony_size: "",
    parking_type: "",
    has_storage: false,
    bathrooms: "",
    toilets: "",
  });

  useEffect(() => {
    if (property && open) {
      // Fetch extended details when modal opens
      fetchExtendedDetails();
      setFormData(prev => ({
        ...prev,
        address: property.address || "",
        city: property.city || "",
        price: property.price?.toString() || "",
        size_sqm: property.size_sqm?.toString() || "",
        rooms: property.rooms?.toString() || "",
        floor: property.floor?.toString() || "",
        total_floors: property.total_floors?.toString() || "",
        air_directions: property.air_directions || [],
        renovation_status: property.renovation_status || "",
        build_year: property.build_year?.toString() || "",
        parking_spots: property.parking_spots?.toString() || "",
        has_elevator: property.has_elevator || false,
        has_balcony: property.has_balcony || false,
        has_safe_room: property.has_safe_room || false,
        has_sun_balcony: property.has_sun_balcony || false,
        description: property.description || "",
      }));
    }
  }, [property, open]);

  const fetchExtendedDetails = async () => {
    if (!property?.id) return;
    const { data } = await supabase
      .from("property_extended_details")
      .select("*")
      .eq("property_id", property.id)
      .maybeSingle();
    
    if (data) {
      setFormData(prev => ({
        ...prev,
        balcony_size: data.balcony_size_sqm?.toString() || "",
        parking_type: data.parking_type || "",
        has_storage: data.has_storage || false,
        bathrooms: data.bathrooms?.toString() || "",
        toilets: data.toilets?.toString() || "",
      }));
    }
  };

  const handleSave = async () => {
    if (!property?.id) return;
    
    setSaving(true);
    try {
      // Update main properties table
      const updateData = {
        address: formData.address,
        city: formData.city,
        price: formData.price ? parseFloat(formData.price) : null,
        size_sqm: formData.size_sqm ? parseInt(formData.size_sqm) : null,
        rooms: formData.rooms ? parseFloat(formData.rooms) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
        air_directions: formData.air_directions.length > 0 ? formData.air_directions : null,
        renovation_status: formData.renovation_status || null,
        build_year: formData.build_year ? parseInt(formData.build_year) : null,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : null,
        has_elevator: formData.has_elevator,
        has_balcony: formData.has_balcony,
        has_safe_room: formData.has_safe_room,
        has_sun_balcony: formData.has_sun_balcony,
        description: formData.description || null,
      };

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", property.id);

      if (error) throw error;

      // Upsert extended details
      const extendedData = {
        property_id: property.id,
        balcony_size_sqm: formData.balcony_size ? parseFloat(formData.balcony_size) : null,
        parking_type: formData.parking_type || null,
        has_storage: formData.has_storage,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        toilets: formData.toilets ? parseInt(formData.toilets) : null,
      };

      const { error: extError } = await supabase
        .from("property_extended_details")
        .upsert(extendedData, { onConflict: "property_id" });

      if (extError) throw extError;

      toast.success("הנכס עודכן בהצלחה");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating property:", error);
      toast.error("שגיאה בעדכון הנכס: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת נכס - {property?.address}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">פרטים בסיסיים</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-address">כתובת</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">עיר</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">מחיר (₪)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-size">גודל (מ"ר)</Label>
                <Input
                  id="edit-size"
                  type="number"
                  value={formData.size_sqm}
                  onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rooms">חדרים</Label>
                <Input
                  id="edit-rooms"
                  type="number"
                  step="0.5"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Building Info - Enrichment Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">פרטי בניין</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-floor">קומה</Label>
                <Input
                  id="edit-floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-total-floors">סה"כ קומות בבניין</Label>
                <Input
                  id="edit-total-floors"
                  type="number"
                  value={formData.total_floors}
                  onChange={(e) => setFormData({ ...formData, total_floors: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-build-year">שנת בנייה</Label>
                <Input
                  id="edit-build-year"
                  type="number"
                  placeholder="למשל: 2015"
                  value={formData.build_year}
                  onChange={(e) => setFormData({ ...formData, build_year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parking">מס׳ חניות</Label>
                <Input
                  id="edit-parking"
                  type="number"
                  value={formData.parking_spots}
                  onChange={(e) => setFormData({ ...formData, parking_spots: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-renovation">מצב הנכס</Label>
                <Select
                  value={formData.renovation_status}
                  onValueChange={(value) => setFormData({ ...formData, renovation_status: value })}
                >
                  <SelectTrigger id="edit-renovation">
                    <SelectValue placeholder="בחר מצב" />
                  </SelectTrigger>
                  <SelectContent>
                    {RENOVATION_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>כיווני אוויר</Label>
                <div className="flex flex-wrap gap-3">
                  {AIR_DIRECTION_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.air_directions.includes(opt.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, air_directions: [...formData.air_directions, opt.value] });
                          } else {
                            setFormData({ ...formData, air_directions: formData.air_directions.filter(d => d !== opt.value) });
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
          </div>

          {/* Extended Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">פרטים נוספים</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-balcony-size">גודל מרפסת במ״ר</Label>
                <Input
                  id="edit-balcony-size"
                  type="number"
                  value={formData.balcony_size}
                  onChange={(e) => setFormData({ ...formData, balcony_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parking-type">סוג חניה</Label>
                <Select
                  value={formData.parking_type}
                  onValueChange={(value) => setFormData({ ...formData, parking_type: value })}
                >
                  <SelectTrigger id="edit-parking-type">
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bathrooms">חדרי רחצה</Label>
                <Input
                  id="edit-bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-toilets">שירותים</Label>
                <Input
                  id="edit-toilets"
                  type="number"
                  value={formData.toilets}
                  onChange={(e) => setFormData({ ...formData, toilets: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse col-span-2">
                <Checkbox
                  id="edit-storage"
                  checked={formData.has_storage}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_storage: checked as boolean })}
                />
                <Label htmlFor="edit-storage" className="cursor-pointer">מחסן</Label>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">תכונות</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="edit-elevator"
                  checked={formData.has_elevator}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_elevator: checked as boolean })}
                />
                <Label htmlFor="edit-elevator" className="cursor-pointer">מעלית</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="edit-balcony"
                  checked={formData.has_balcony}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_balcony: checked as boolean })}
                />
                <Label htmlFor="edit-balcony" className="cursor-pointer">מרפסת</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="edit-sun-balcony"
                  checked={formData.has_sun_balcony}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_sun_balcony: checked as boolean })}
                />
                <Label htmlFor="edit-sun-balcony" className="cursor-pointer">מרפסת שמש</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="edit-safe-room"
                  checked={formData.has_safe_room}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_safe_room: checked as boolean })}
                />
                <Label htmlFor="edit-safe-room" className="cursor-pointer">ממ״ד</Label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">תיאור</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
