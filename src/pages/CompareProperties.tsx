import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Home, Maximize, Building, Car, Bath, Calendar, FileText, Info } from "lucide-react";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  size_sqm: number | null;
  rooms: number | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
}

interface BuyerProperty {
  id: string;
  property_id: string;
  status: string;
  note: string | null;
  liked_text: string | null;
  disliked_text: string | null;
  properties: Property;
}

interface ExtendedDetailsRow {
  id: string;
  property_id: string;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  elevators_count: number | null;
  tenants_count: number | null;
  parking_count: number | null;
  parking_covered: boolean | null;
  parking_type: string[] | null;
  has_storage: boolean | null;
  storage_size_sqm: number | null;
  balcony_size_sqm: number | null;
  renovation_level: string | null;
  bathrooms: number | null;
  toilets: number | null;
  building_year: number | null;
  air_directions: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ComparisonProperty {
  buyerProperty: BuyerProperty;
  extended: ExtendedDetailsRow | null;
  comparisonNote: string;
}

const CompareProperties = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const buyerId = searchParams.get("buyerId");
  const propertyIds = searchParams.get("properties")?.split(",") || [];
  
  const [comparisonData, setComparisonData] = useState<ComparisonProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonNotes, setComparisonNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (buyerId && propertyIds.length >= 2) {
      fetchComparisonData();
    }
  }, [buyerId, propertyIds.join(",")]);

  const fetchComparisonData = async () => {
    setLoading(true);
    
    try {
      // Fetch buyer properties
      const { data: buyerProperties, error } = await supabase
        .from("buyer_properties")
        .select(`
          *,
          properties (
            *,
            property_images (url, is_primary)
          )
        `)
        .eq("buyer_id", buyerId)
        .in("property_id", propertyIds);

      if (error) throw error;

      // Fetch extended details for each property
      const extendedPromises = propertyIds.map(async (propId) => {
        const { data } = await supabase
          .from("property_extended_details")
          .select("*")
          .eq("property_id", propId)
          .maybeSingle();
        return { propId, data };
      });

      const extendedResults = await Promise.all(extendedPromises);
      const extendedMap = new Map(extendedResults.map(r => [r.propId, r.data]));

      // Build comparison data
      const data: ComparisonProperty[] = (buyerProperties || []).map((bp) => ({
        buyerProperty: bp,
        extended: extendedMap.get(bp.property_id) || null,
        comparisonNote: "",
      }));

      setComparisonData(data);
    } catch (err) {
      console.error("Error fetching comparison data:", err);
      toast.error("שגיאה בטעינת נתוני ההשוואה");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getRenovationLabel = (status: string | null | undefined) => {
    if (!status) return "—";
    const labels: Record<string, string> = {
      new: "חדש מקבלן",
      renovated: "משופץ",
      good: "במצב טוב",
      needs_renovation: "דורש שיפוץ",
    };
    return labels[status] || status;
  };

  const getParkingTypeDisplay = (types: string[] | null | undefined) => {
    if (!types || types.length === 0) return "";
    const labels: Record<string, string> = {
      tabu: "רשומה בטאבו",
      shared: "חניה משותפת",
      covered: "מקורה",
      open: "פתוחה",
      tandem: "עוקבת (טורית)",
      double: "כפולה / מכפיל",
    };
    return types.map(t => labels[t] || t).join(", ");
  };

  const getAirDirectionsDisplay = (directions: string[] | null) => {
    if (!directions || directions.length === 0) return "—";
    const labels: Record<string, string> = {
      north: "צפון",
      south: "דרום",
      east: "מזרח",
      west: "מערב",
      northeast: "צפון-מזרח",
      northwest: "צפון-מערב",
      southeast: "דרום-מזרח",
      southwest: "דרום-מערב",
    };
    return directions.map(d => labels[d] || d).join(", ");
  };

  const getValue = (item: ComparisonProperty, field: string): string => {
    const prop = item.buyerProperty.properties as any;
    const ext = item.extended;

    switch (field) {
      case "price":
        return formatPrice(prop.price);
      case "size_sqm":
        return prop.size_sqm ? `${prop.size_sqm} מ״ר` : "—";
      case "price_per_sqm":
        return prop.size_sqm ? `₪${Math.round(prop.price / prop.size_sqm).toLocaleString()}` : "—";
      case "rooms":
        return prop.rooms ? `${prop.rooms}` : "—";
      case "floor":
        // Read from main properties table
        if (prop.floor != null && prop.total_floors != null) {
          return `${prop.floor} מתוך ${prop.total_floors}`;
        }
        return prop.floor != null ? `${prop.floor}` : "—";
      case "total_floors":
        return prop.total_floors != null ? `${prop.total_floors}` : "—";
      case "elevators":
        // Check from main properties table, count from extended
        if (!prop.has_elevator) return "אין";
        return ext?.elevators_count ? `יש (${ext.elevators_count})` : "יש";
      case "tenants":
        return ext?.tenants_count != null ? `${ext.tenants_count}` : "—";
      case "parking":
        // Show parking count from properties table and type from extended details
        const count = prop.parking_spots ?? ext?.parking_count ?? 0;
        const typeDisplay = getParkingTypeDisplay(ext?.parking_type);
        if (count === 0 && !typeDisplay) return "אין";
        return typeDisplay ? `${count} (${typeDisplay})` : `${count}`;
      case "storage":
        if (!ext) return "—";
        if (!ext.has_storage) return "אין";
        return ext.storage_size_sqm ? `יש (${ext.storage_size_sqm} מ״ר)` : "יש";
      case "balcony":
        // Check has_balcony from properties table, size from extended
        if (!prop.has_balcony) return "אין";
        return ext?.balcony_size_sqm ? `כן (${ext.balcony_size_sqm} מ״ר)` : "כן";
      case "sun_balcony":
        // Check from main properties table
        return prop.has_sun_balcony ? "יש" : "אין";
      case "renovation":
        // Read from main properties table
        return getRenovationLabel(prop.renovation_status);
      case "bathrooms":
        return ext?.bathrooms != null ? `${ext.bathrooms}` : "—";
      case "toilets":
        return ext?.toilets != null ? `${ext.toilets}` : "—";
      case "building_year":
        // Read from main properties table
        return prop.build_year != null ? `${prop.build_year}` : "—";
      case "air_directions":
        // Check main properties table first, then extended details
        return getAirDirectionsDisplay(prop.air_directions || ext?.air_directions || null);
      default:
        return "—";
    }
  };

  const comparisonFields = [
    { key: "price", label: "מחיר", category: "basic" },
    { key: "size_sqm", label: "גודל", category: "basic" },
    { key: "price_per_sqm", label: "מחיר למ״ר", category: "basic" },
    { key: "rooms", label: "חדרים", category: "basic" },
    { key: "floor", label: "קומה", category: "technical" },
    { key: "total_floors", label: "סה״כ קומות", category: "technical" },
    { key: "elevators", label: "מעליות", category: "technical" },
    { key: "tenants", label: "דיירים בבניין", category: "technical" },
    { key: "parking", label: "חניה", category: "technical" },
    { key: "storage", label: "מחסן", category: "technical" },
    { key: "balcony", label: "מרפסת", category: "technical" },
    { key: "renovation", label: "רמת שיפוץ", category: "technical" },
    { key: "bathrooms", label: "חדרי רחצה", category: "technical" },
    { key: "toilets", label: "שירותים", category: "technical" },
    { key: "building_year", label: "שנת בנייה", category: "technical" },
    { key: "air_directions", label: "כיווני אוויר", category: "technical" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (comparisonData.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">יש לבחור לפחות 2 נכסים להשוואה</p>
          <Button onClick={() => navigate(`/buyer/${buyerId}`)}>חזרה לנכסים</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={extraMileLogo} alt="EXTRAMILE" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-semibold text-lg">השוואת נכסים</span>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/buyer/${buyerId}`)}>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לנכסים
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Property Headers */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}>
          <div className="font-semibold text-muted-foreground">פרמטר</div>
          {comparisonData.map((item) => {
            const prop = item.buyerProperty.properties;
            const mainImage = prop.property_images?.find(i => i.is_primary)?.url || prop.property_images?.[0]?.url;
            return (
              <Card key={item.buyerProperty.id} className="overflow-hidden">
                {mainImage && (
                  <img src={mainImage} alt={prop.address} className="w-full h-32 object-cover" />
                )}
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm truncate">{prop.address}</h3>
                  <p className="text-xs text-muted-foreground">{prop.city}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              נתונים בסיסיים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {comparisonFields.filter(f => f.category === "basic").map((field) => (
                <div 
                  key={field.key} 
                  className="grid gap-4 p-3 hover:bg-muted/50"
                  style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
                >
                  <div className="font-medium text-muted-foreground">{field.label}</div>
                  {comparisonData.map((item) => (
                    <div key={item.buyerProperty.id} className="font-semibold">
                      {getValue(item, field.key)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              נתונים טכניים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {comparisonFields.filter(f => f.category === "technical").map((field) => (
                <div 
                  key={field.key} 
                  className="grid gap-4 p-3 hover:bg-muted/50"
                  style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
                >
                  <div className="font-medium text-muted-foreground">{field.label}</div>
                  {comparisonData.map((item) => (
                    <div key={item.buyerProperty.id}>
                      {getValue(item, field.key)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Notes Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              הערות הלקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {/* Liked */}
              <div 
                className="grid gap-4 p-3"
                style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
              >
                <div className="font-medium text-muted-foreground">מה אהבתי</div>
                {comparisonData.map((item) => (
                  <div key={item.buyerProperty.id} className="text-sm">
                    {item.buyerProperty.liked_text || "—"}
                  </div>
                ))}
              </div>
              {/* Disliked */}
              <div 
                className="grid gap-4 p-3"
                style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
              >
                <div className="font-medium text-muted-foreground">מה פחות אהבתי</div>
                {comparisonData.map((item) => (
                  <div key={item.buyerProperty.id} className="text-sm">
                    {item.buyerProperty.disliked_text || "—"}
                  </div>
                ))}
              </div>
              {/* Note */}
              <div 
                className="grid gap-4 p-3"
                style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
              >
                <div className="font-medium text-muted-foreground">הערה אישית</div>
                {comparisonData.map((item) => (
                  <div key={item.buyerProperty.id} className="text-sm">
                    {item.buyerProperty.note || "—"}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Comparison Notes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>הערות השוואה אישיות</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${comparisonData.length}, 1fr)` }}
            >
              {comparisonData.map((item) => (
                <div key={item.buyerProperty.id}>
                  <p className="text-sm font-medium mb-2">{item.buyerProperty.properties.address}</p>
                  <Textarea
                    value={comparisonNotes[item.buyerProperty.id] || ""}
                    onChange={(e) => setComparisonNotes(prev => ({
                      ...prev,
                      [item.buyerProperty.id]: e.target.value
                    }))}
                    placeholder="כתוב הערת השוואה אישית..."
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompareProperties;