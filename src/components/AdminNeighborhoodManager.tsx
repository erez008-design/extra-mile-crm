import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useNeighborhoods, AdminNeighborhoodAddition, STATIC_NEIGHBORHOODS } from "@/hooks/useNeighborhoods";

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

export const AdminNeighborhoodManager = () => {
  const { adminAdditions, refetch, loading } = useNeighborhoods();
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!selectedCity || !neighborhoodName.trim()) {
      toast.error("נא לבחור עיר ולהזין שם שכונה");
      return;
    }

    // Check if exists in static dictionary
    if (STATIC_NEIGHBORHOODS[selectedCity]?.includes(neighborhoodName.trim())) {
      toast.error("השכונה כבר קיימת ברשימה הבסיסית");
      return;
    }

    // Check if already added dynamically
    if (adminAdditions.some(a => 
      a.city_name === selectedCity && 
      a.neighborhood_name === neighborhoodName.trim()
    )) {
      toast.error("השכונה כבר נוספה");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_neighborhood_additions")
        .insert({
          city_name: selectedCity,
          neighborhood_name: neighborhoodName.trim(),
        });

      if (error) throw error;

      toast.success("השכונה נוספה בהצלחה");
      setNeighborhoodName("");
      refetch();
    } catch (error: any) {
      console.error("Error adding neighborhood:", error);
      if (error.code === "23505") {
        toast.error("השכונה כבר קיימת");
      } else {
        toast.error("שגיאה בהוספת השכונה");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addition: AdminNeighborhoodAddition) => {
    try {
      const { error } = await supabase
        .from("admin_neighborhood_additions")
        .delete()
        .eq("id", addition.id);

      if (error) throw error;

      toast.success("השכונה הוסרה בהצלחה");
      refetch();
    } catch (error) {
      console.error("Error deleting neighborhood:", error);
      toast.error("שגיאה בהסרת השכונה");
    }
  };

  // Group additions by city for display
  const additionsByCity = adminAdditions.reduce((acc, addition) => {
    if (!acc[addition.city_name]) {
      acc[addition.city_name] = [];
    }
    acc[addition.city_name].push(addition);
    return acc;
  }, {} as Record<string, AdminNeighborhoodAddition[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          ניהול שכונות (תוספות דינמיות)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add form */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="city" className="text-sm text-muted-foreground mb-1 block">
              עיר
            </Label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="בחר עיר" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="neighborhood" className="text-sm text-muted-foreground mb-1 block">
              שם שכונה
            </Label>
            <Input
              id="neighborhood"
              value={neighborhoodName}
              onChange={(e) => setNeighborhoodName(e.target.value)}
              placeholder="הזן שם שכונה"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={saving || !selectedCity || !neighborhoodName.trim()}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף
            </Button>
          </div>
        </div>

        {/* Current additions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            תוספות קיימות ({adminAdditions.length})
          </h4>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">טוען...</p>
          ) : adminAdditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין תוספות דינמיות עדיין</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(additionsByCity).map(([city, additions]) => (
                <div key={city} className="border rounded-lg p-3">
                  <h5 className="font-medium text-sm mb-2">{city}</h5>
                  <div className="flex flex-wrap gap-2">
                    {additions.map((addition) => (
                      <Badge
                        key={addition.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {addition.neighborhood_name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                          onClick={() => handleDelete(addition)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          * שכונות שמוספות כאן יתמזגו עם הרשימה הבסיסית ויהיו זמינות לכל הסוכנים
        </p>
      </CardContent>
    </Card>
  );
};
