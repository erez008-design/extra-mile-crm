import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowRight, 
  Home, 
  Maximize, 
  Building, 
  Car, 
  Bath, 
  Calendar, 
  FileText, 
  Info,
  Check,
  X,
  Layers,
  Wind,
  Wrench,
  Package,
  Sun,
  Users
} from "lucide-react";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  elevators_count: number | null;
  has_sun_balcony: boolean | null;
  has_safe_room: boolean | null;
  parking_spots: number | null;
  build_year: number | null;
  renovation_status: string | null;
  air_directions: string[] | null;
  property_type: string | null;
  plot_size_sqm: number | null;
  levels_count: number | null;
  garden_size_sqm: number | null;
  description: string | null;
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

// Yes/No icon component
const BooleanIcon = ({ value, label }: { value: boolean | null | undefined; label?: string }) => {
  if (value === true) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        {label && <span className="text-xs text-foreground">{label}</span>}
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <X className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    );
  }
  return <span className="text-muted-foreground text-xs">—</span>;
};

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
    if (!status) return null;
    const labels: Record<string, string> = {
      new: "חדש מקבלן",
      renovated: "משופץ",
      good: "במצב טוב",
      needs_renovation: "דורש שיפוץ",
    };
    return labels[status] || status;
  };

  const getPropertyTypeLabel = (type: string | null | undefined) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      apartment: "דירה",
      penthouse: "פנטהאוז",
      private_house: "בית פרטי",
      semi_detached: "דו משפחתי",
    };
    return labels[type] || type;
  };

  const isHouseType = (type: string | null | undefined) => {
    return type === "private_house" || type === "semi_detached";
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
    if (!directions || directions.length === 0) return null;
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

  // Check if a row has data in at least one property
  const hasRowData = (field: string): boolean => {
    return comparisonData.some(item => {
      const value = getRawValue(item, field);
      return value !== null && value !== undefined && value !== "" && value !== "—";
    });
  };

  // Get raw value for checking if data exists
  const getRawValue = (item: ComparisonProperty, field: string): any => {
    const prop = item.buyerProperty.properties as any;
    const ext = item.extended;

    switch (field) {
      case "property_type": return prop.property_type;
      case "price": return prop.price;
      case "size_sqm": return prop.size_sqm;
      case "plot_size_sqm": return prop.plot_size_sqm;
      case "garden_size_sqm": return prop.garden_size_sqm;
      case "price_per_sqm": return prop.size_sqm ? prop.price / prop.size_sqm : null;
      case "rooms": return prop.rooms;
      case "levels_count": return prop.levels_count;
      case "floor": return prop.floor;
      case "total_floors": return prop.total_floors;
      case "elevators": return prop.has_elevator;
      case "tenants": return ext?.tenants_count;
      case "parking": return prop.parking_spots ?? ext?.parking_count;
      case "storage": return ext?.has_storage;
      case "balcony": return prop.has_sun_balcony;
      case "safe_room": return prop.has_safe_room;
      case "renovation": return prop.renovation_status;
      case "bathrooms": return ext?.bathrooms;
      case "toilets": return ext?.toilets;
      case "building_year": return prop.build_year;
      case "air_directions": return prop.air_directions || ext?.air_directions;
      case "description": return prop.description;
      default: return null;
    }
  };

  // Render value with icons for boolean fields
  const renderValue = (item: ComparisonProperty, field: string): React.ReactNode => {
    const prop = item.buyerProperty.properties as any;
    const ext = item.extended;
    const isHouse = isHouseType(prop.property_type);

    switch (field) {
      case "property_type": {
        const label = getPropertyTypeLabel(prop.property_type);
        return label ? <span className="text-xs sm:text-sm font-medium">{label}</span> : null;
      }
      case "price":
        return (
          <span className="text-primary font-bold text-sm sm:text-base">
            {formatPrice(prop.price)}
          </span>
        );
      case "size_sqm":
        return prop.size_sqm ? (
          <span className="font-semibold text-sm">{prop.size_sqm} מ״ר</span>
        ) : null;
      case "plot_size_sqm":
        return prop.plot_size_sqm ? (
          <span className="font-semibold text-sm">{prop.plot_size_sqm} מ״ר</span>
        ) : null;
      case "garden_size_sqm":
        return prop.garden_size_sqm ? (
          <span className="font-semibold text-sm">{prop.garden_size_sqm} מ״ר</span>
        ) : null;
      case "price_per_sqm":
        return prop.size_sqm ? (
          <span className="text-muted-foreground text-xs sm:text-sm">
            ₪{Math.round(prop.price / prop.size_sqm).toLocaleString()}
          </span>
        ) : null;
      case "rooms":
        return prop.rooms ? (
          <span className="font-semibold text-sm">{prop.rooms}</span>
        ) : null;
      case "levels_count":
        return prop.levels_count ? (
          <span className="text-sm">{prop.levels_count} מפלסים</span>
        ) : null;
      case "floor":
        // Hide floor for houses
        if (isHouse) return null;
        if (prop.floor != null && prop.total_floors != null) {
          return <span className="text-sm">{prop.floor} מתוך {prop.total_floors}</span>;
        }
        return prop.floor != null ? <span className="text-sm">{prop.floor}</span> : null;
      case "total_floors":
        // Hide total_floors for houses
        if (isHouse) return null;
        return prop.total_floors != null ? (
          <span className="text-sm">{prop.total_floors}</span>
        ) : null;
      case "elevators": {
        // Hide elevator for houses
        if (isHouse) return null;
        if (prop.has_elevator === false) return <BooleanIcon value={false} />;
        if (prop.has_elevator === true) {
          // Prioritize elevators_count from properties table, fallback to extended details
          const count = prop.elevators_count ?? ext?.elevators_count;
          return <BooleanIcon value={true} label={count ? `(${count})` : undefined} />;
        }
        return null;
      }
      case "tenants":
        return ext?.tenants_count != null ? (
          <span className="text-sm">{ext.tenants_count}</span>
        ) : null;
      case "parking": {
        const count = prop.parking_spots ?? ext?.parking_count ?? 0;
        const typeDisplay = getParkingTypeDisplay(ext?.parking_type);
        if (count === 0 && !typeDisplay) return <BooleanIcon value={false} />;
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Car className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs">{count}{typeDisplay ? ` (${typeDisplay})` : ""}</span>
          </div>
        );
      }
      case "storage": {
        if (!ext?.has_storage) return <BooleanIcon value={ext?.has_storage ?? null} />;
        const size = ext.storage_size_sqm;
        return <BooleanIcon value={true} label={size ? `(${size} מ״ר)` : undefined} />;
      }
      case "balcony": {
        // Hide balcony for houses
        if (isHouse) return null;
        if (!prop.has_sun_balcony) return <BooleanIcon value={prop.has_sun_balcony ?? null} />;
        const size = ext?.balcony_size_sqm;
        return <BooleanIcon value={true} label={size ? `(${size} מ״ר)` : undefined} />;
      }
      case "safe_room":
        return <BooleanIcon value={prop.has_safe_room} />;
      case "renovation": {
        const label = getRenovationLabel(prop.renovation_status);
        return label ? <span className="text-xs sm:text-sm">{label}</span> : null;
      }
      case "bathrooms":
        return ext?.bathrooms != null ? (
          <span className="text-sm">{ext.bathrooms}</span>
        ) : null;
      case "toilets":
        return ext?.toilets != null ? (
          <span className="text-sm">{ext.toilets}</span>
        ) : null;
      case "building_year":
        return prop.build_year != null ? (
          <span className="text-sm">{prop.build_year}</span>
        ) : null;
      case "air_directions": {
        const dirs = getAirDirectionsDisplay(prop.air_directions || ext?.air_directions || null);
        return dirs ? <span className="text-xs">{dirs}</span> : null;
      }
      case "description":
        return prop.description ? (
          <p className="text-xs leading-relaxed line-clamp-4">{prop.description}</p>
        ) : null;
      default:
        return null;
    }
  };

  // Check if any property is a house type
  const hasAnyHouse = comparisonData.some(item => 
    isHouseType(item.buyerProperty.properties.property_type)
  );
  
  // Check if any property is an apartment type
  const hasAnyApartment = comparisonData.some(item => 
    !isHouseType(item.buyerProperty.properties.property_type)
  );

  const comparisonFields = [
    { key: "property_type", label: "סוג נכס", icon: Home, category: "basic" },
    { key: "price", label: "מחיר", icon: Home, category: "basic" },
    { key: "size_sqm", label: "שטח בנוי", icon: Maximize, category: "basic" },
    ...(hasAnyHouse ? [{ key: "plot_size_sqm", label: "שטח מגרש", icon: Maximize, category: "basic" }] : []),
    ...(hasAnyHouse ? [{ key: "garden_size_sqm", label: "שטח גינה", icon: Maximize, category: "basic" }] : []),
    { key: "price_per_sqm", label: "מחיר למ״ר", icon: Home, category: "basic" },
    { key: "rooms", label: "חדרים", icon: Layers, category: "basic" },
    ...(hasAnyHouse ? [{ key: "levels_count", label: "מפלסים", icon: Layers, category: "basic" }] : []),
    ...(hasAnyApartment ? [{ key: "floor", label: "קומה", icon: Building, category: "technical" }] : []),
    ...(hasAnyApartment ? [{ key: "elevators", label: "מעליות", icon: Building, category: "technical" }] : []),
    ...(hasAnyApartment ? [{ key: "tenants", label: "דיירים בבניין", icon: Users, category: "technical" }] : []),
    { key: "parking", label: "חניה", icon: Car, category: "technical" },
    { key: "storage", label: "מחסן", icon: Package, category: "technical" },
    ...(hasAnyApartment ? [{ key: "balcony", label: "מרפסת שמש", icon: Sun, category: "technical" }] : []),
    { key: "safe_room", label: "ממ״ד", icon: Building, category: "technical" },
    { key: "renovation", label: "רמת שיפוץ", icon: Wrench, category: "technical" },
    { key: "bathrooms", label: "חדרי רחצה", icon: Bath, category: "technical" },
    { key: "toilets", label: "שירותים", icon: Bath, category: "technical" },
    { key: "building_year", label: "שנת בנייה", icon: Calendar, category: "technical" },
    // Location & Description category
    { key: "air_directions", label: "כיווני אוויר", icon: Wind, category: "location" },
    { key: "description", label: "תיאור הנכס", icon: FileText, category: "location" },
  ];

  // Filter fields that have data
  const fieldsWithData = comparisonFields.filter(f => hasRowData(f.key));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (comparisonData.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center shadow-medium">
          <p className="text-muted-foreground mb-4">יש לבחור לפחות 2 נכסים להשוואה</p>
          <Button onClick={() => navigate(`/buyer/${buyerId}`)}>חזרה לנכסים</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Compact Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm shadow-soft sticky top-0 z-30">
        <div className="container mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src={extraMileLogo} 
                alt="EXTRAMILE" 
                className="w-7 h-7 rounded-lg object-cover" 
              />
              <span className="font-semibold text-sm">השוואת נכסים</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/buyer/${buyerId}`)} 
              className="h-8 px-2"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>חזרה</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Sticky Property Cards Header */}
      <div className="sticky top-[49px] z-20 bg-card border-b shadow-soft">
        <div className="container mx-auto px-3 py-3">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {comparisonData.map((item, index) => {
              const prop = item.buyerProperty.properties;
              const mainImage = prop.property_images?.find(i => i.is_primary)?.url || prop.property_images?.[0]?.url;
              return (
                <div 
                  key={item.buyerProperty.id} 
                  className="flex-shrink-0 bg-background rounded-xl p-2.5 shadow-soft border min-w-[140px] max-w-[180px]"
                >
                  {mainImage && (
                    <img 
                      src={mainImage} 
                      alt={prop.address} 
                      className="w-full h-20 rounded-lg object-cover mb-2" 
                    />
                  )}
                  <h3 className="font-semibold text-xs leading-tight line-clamp-2 mb-0.5">
                    {prop.address}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{prop.city}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-3 py-4 space-y-4">
        {/* Basic Data Card */}
        <Card className="shadow-soft overflow-hidden">
          <CardHeader className="py-3 px-4 bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Home className="w-4 h-4 text-primary" />
              נתונים בסיסיים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {fieldsWithData
              .filter(f => f.category === "basic")
              .map((field, idx) => (
                <div 
                  key={field.key} 
                  className={`flex items-center gap-3 px-4 py-3 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                >
                  {/* Label Column - Fixed width */}
                  <div className="w-24 flex-shrink-0 flex items-center gap-2">
                    <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">{field.label}</span>
                  </div>
                  {/* Values */}
                  <div className="flex-1 flex gap-4">
                    {comparisonData.map((item) => (
                      <div 
                        key={item.buyerProperty.id} 
                        className="flex-1 min-w-0"
                      >
                        {renderValue(item, field.key) || <span className="text-muted-foreground/50 text-xs">—</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Technical Data Card */}
        <Card className="shadow-soft overflow-hidden">
          <CardHeader className="py-3 px-4 bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Info className="w-4 h-4 text-primary" />
              נתונים טכניים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {fieldsWithData
              .filter(f => f.category === "technical")
              .map((field, idx) => (
                <div 
                  key={field.key} 
                  className={`flex items-center gap-3 px-4 py-3 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                >
                  {/* Label Column - Fixed width */}
                  <div className="w-24 flex-shrink-0 flex items-center gap-2">
                    <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">{field.label}</span>
                  </div>
                  {/* Values */}
                  <div className="flex-1 flex gap-4">
                    {comparisonData.map((item) => (
                      <div 
                        key={item.buyerProperty.id} 
                        className="flex-1 min-w-0"
                      >
                        {renderValue(item, field.key) || <span className="text-muted-foreground/50 text-xs">—</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Location & Description Card */}
        {fieldsWithData.some(f => f.category === "location") && (
          <Card className="shadow-soft overflow-hidden">
            <CardHeader className="py-3 px-4 bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Wind className="w-4 h-4 text-primary" />
                מיקום ותיאור
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fieldsWithData
                .filter(f => f.category === "location")
                .map((field, idx) => (
                  <div 
                    key={field.key} 
                    className={`flex items-start gap-3 px-4 py-3 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    {/* Label Column - Fixed width */}
                    <div className="w-24 flex-shrink-0 flex items-center gap-2 pt-0.5">
                      <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">{field.label}</span>
                    </div>
                    {/* Values */}
                    <div className="flex-1 flex gap-4">
                      {comparisonData.map((item) => (
                        <div 
                          key={item.buyerProperty.id} 
                          className="flex-1 min-w-0"
                        >
                          {renderValue(item, field.key) || <span className="text-muted-foreground/50 text-xs">—</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Client Notes Card */}
        <Card className="shadow-soft overflow-hidden">
          <CardHeader className="py-3 px-4 bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="w-4 h-4 text-primary" />
              הערות הלקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Liked */}
            {comparisonData.some(item => item.buyerProperty.liked_text) && (
              <div className="flex items-start gap-3 px-4 py-3 bg-background">
                <div className="w-24 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">מה אהבתי</span>
                </div>
                <div className="flex-1 flex gap-4">
                  {comparisonData.map((item) => (
                    <div key={item.buyerProperty.id} className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        {item.buyerProperty.liked_text || <span className="text-muted-foreground/50">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Disliked */}
            {comparisonData.some(item => item.buyerProperty.disliked_text) && (
              <div className="flex items-start gap-3 px-4 py-3 bg-muted/20">
                <div className="w-24 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">מה פחות אהבתי</span>
                </div>
                <div className="flex-1 flex gap-4">
                  {comparisonData.map((item) => (
                    <div key={item.buyerProperty.id} className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        {item.buyerProperty.disliked_text || <span className="text-muted-foreground/50">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Note */}
            {comparisonData.some(item => item.buyerProperty.note) && (
              <div className="flex items-start gap-3 px-4 py-3 bg-background">
                <div className="w-24 flex-shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">הערה אישית</span>
                </div>
                <div className="flex-1 flex gap-4">
                  {comparisonData.map((item) => (
                    <div key={item.buyerProperty.id} className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        {item.buyerProperty.note || <span className="text-muted-foreground/50">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Show message if no notes */}
            {!comparisonData.some(item => item.buyerProperty.liked_text || item.buyerProperty.disliked_text || item.buyerProperty.note) && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">אין הערות עדיין</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Comparison Notes */}
        <Card className="shadow-soft">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">הערות השוואה אישיות</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comparisonData.map((item) => {
                const prop = item.buyerProperty.properties;
                return (
                  <div key={item.buyerProperty.id} className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground line-clamp-1">
                      {prop.address}
                    </label>
                    <Textarea
                      placeholder="הערות אישיות..."
                      value={comparisonNotes[item.buyerProperty.id] || ""}
                      onChange={(e) => setComparisonNotes({
                        ...comparisonNotes,
                        [item.buyerProperty.id]: e.target.value
                      })}
                      className="text-sm min-h-[80px] resize-none"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompareProperties;
