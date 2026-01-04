import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowRight, 
  MapPin, 
  Home, 
  Maximize, 
  Heart,
  Building, 
  Car, 
  Info, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useGetExtendedProperty } from "@/hooks/usePropertyExtendedDetails";
import extraMileLogo from "@/assets/extramile-logo.jpg";
import RegistrationDrawer from "@/components/catalog/RegistrationDrawer";

interface Property {
  id: string;
  address: string;
  city: string;
  neighborhood: string | null;
  price: number;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  parking_spots: number | null;
  property_type: string | null;
  description: string | null;
  agent_id: string | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
}

const CatalogPropertyDetails = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  
  // Check if buyer is already registered
  const [registeredBuyerId, setRegisteredBuyerId] = useState<string | null>(() => {
    return localStorage.getItem("catalog_buyer_id");
  });
  
  // Extended details
  const { data: extendedDetails, isLoading: loadingExtended } = useGetExtendedProperty(propertyId);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  useEffect(() => {
    if (registeredBuyerId && propertyId) {
      checkIfSaved();
    }
  }, [registeredBuyerId, propertyId]);

  const fetchProperty = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images (url, is_primary)
      `)
      .eq("id", propertyId)
      .single();

    if (error) {
      console.error("Error fetching property:", error);
      toast.error("שגיאה בטעינת הנכס");
    } else {
      setProperty(data);
    }
    
    setLoading(false);
  };

  const checkIfSaved = async () => {
    if (!registeredBuyerId || !propertyId) return;
    
    const { data } = await supabase
      .from("buyer_properties")
      .select("id")
      .eq("buyer_id", registeredBuyerId)
      .eq("property_id", propertyId)
      .maybeSingle();
    
    setIsSaved(!!data);
  };

  const handleSave = async () => {
    if (!registeredBuyerId) {
      setShowRegistration(true);
      return;
    }

    await savePropertyForBuyer(registeredBuyerId);
  };

  const savePropertyForBuyer = async (buyerId: string) => {
    if (!property) return;

    try {
      if (isSaved) {
        navigate(`/buyer/${buyerId}`);
        return;
      }

      const { error: bpError } = await supabase
        .from("buyer_properties")
        .insert({
          buyer_id: buyerId,
          property_id: property.id,
          agent_id: property.agent_id || null,
          status: "interested"
        });

      if (bpError) throw bpError;

      await supabase.from("activity_logs").insert({
        buyer_id: buyerId,
        agent_id: property.agent_id || null,
        action_type: "property_saved" as any,
        description: `קונה שמר נכס מהקטלוג: ${property.address}`,
        metadata: { 
          source: "public_catalog", 
          property_id: property.id,
          property_address: property.address
        }
      });

      if (property.agent_id) {
        await supabase.from("notifications").insert({
          buyer_id: buyerId,
          agent_id: property.agent_id,
          property_id: property.id,
          match_score: 100,
          match_reason: "קונה חדש שמר את הנכס מהקטלוג הציבורי"
        });
      }

      setIsSaved(true);
      toast.success("הנכס נשמר ליומן שלך");
      navigate(`/buyer/${buyerId}`);
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("שגיאה בשמירת הנכס");
    }
  };

  const handleRegistrationComplete = async (buyerId: string, buyerName: string) => {
    localStorage.setItem("catalog_buyer_id", buyerId);
    localStorage.setItem("catalog_buyer_name", buyerName);
    
    setRegisteredBuyerId(buyerId);
    setShowRegistration(false);

    await savePropertyForBuyer(buyerId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getRenovationLabel = (level: string | null) => {
    if (!level) return "—";
    const labels: Record<string, string> = {
      new: "חדש",
      renovated: "משופץ",
      needs_renovation: "דרוש שיפוץ",
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">לא נמצא נכס</p>
          <Button className="mt-4" onClick={() => navigate("/catalog")}>
            חזרה לקטלוג
          </Button>
        </Card>
      </div>
    );
  }

  const images = property.property_images?.length > 0
    ? property.property_images.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", is_primary: true }];
  const pricePerSqm = property.size_sqm ? Math.round(property.price / property.size_sqm) : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={extraMileLogo} alt="EXTRAMILE" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-semibold">EXTRAMILE</span>
            </div>
            <Button variant="ghost" onClick={() => navigate("/catalog")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לקטלוג
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Title & Save Button */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">{property.address}</h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {property.city}
              {property.neighborhood && ` | ${property.neighborhood}`}
            </p>
          </div>
          <Button
            variant={isSaved ? "default" : "outline"}
            onClick={handleSave}
            className="gap-2"
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "נשמר ביומן" : "שמור ליומן"}
          </Button>
        </div>

        {/* Image Gallery */}
        <Card className="overflow-hidden mb-6">
          <div className="relative h-[300px] md:h-[450px]">
            <img
              src={images[selectedImage].url}
              alt={property.address}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <Badge className="absolute top-3 left-3 bg-black/60 text-white">
                  {selectedImage + 1} / {images.length}
                </Badge>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto bg-muted/30">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? "border-primary" : "border-transparent opacity-60"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Description */}
        {property.description && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-muted-foreground leading-relaxed">{property.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="text-sm text-muted-foreground mb-1">מחיר</div>
                <div className="text-3xl font-bold text-primary mb-2">{formatPrice(property.price)}</div>
                {pricePerSqm && (
                  <div className="text-sm text-muted-foreground">
                    ₪{pricePerSqm.toLocaleString()} למ״ר
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Basic Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  פרטי הנכס
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {property.rooms && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span>{property.rooms} חדרים</span>
                    </div>
                  )}
                  {property.size_sqm && (
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4 text-muted-foreground" />
                      <span>{property.size_sqm} מ״ר</span>
                    </div>
                  )}
                  {property.floor !== null && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span>קומה {property.floor}</span>
                    </div>
                  )}
                  {property.parking_spots !== null && (
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span>{property.parking_spots > 0 ? `${property.parking_spots} חניות` : "ללא חניה"}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Extended Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  נתונים טכניים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingExtended ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : extendedDetails ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">קומה</span>
                      <span>{extendedDetails.floor ?? "—"} / {extendedDetails.total_floors ?? "—"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">מעליות</span>
                      <span>{extendedDetails.has_elevator ? (extendedDetails.elevators_count || 1) : "אין"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">חניה</span>
                      <span>
                        {extendedDetails.parking_count || 0}
                        {extendedDetails.parking_covered && " (מקורה)"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">מחסן</span>
                      <span>
                        {extendedDetails.has_storage 
                          ? (extendedDetails.storage_size_sqm ? `${extendedDetails.storage_size_sqm} מ״ר` : "יש")
                          : "אין"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">מרפסת</span>
                      <span>{extendedDetails.balcony_size_sqm ? `${extendedDetails.balcony_size_sqm} מ״ר` : "—"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">שיפוץ</span>
                      <span>{getRenovationLabel(extendedDetails.renovation_level)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">חדרי רחצה</span>
                      <span>{extendedDetails.bathrooms ?? "—"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">שירותים</span>
                      <span>{extendedDetails.toilets ?? "—"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">שנת בנייה</span>
                      <span>{extendedDetails.building_year ?? "—"}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">כיווני אוויר</span>
                      <span>{extendedDetails.air_directions ?? "—"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    נתונים טכניים טרם הוזנו לנכס זה.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="font-semibold text-lg">מעוניין בנכס?</h3>
                <p className="text-sm text-muted-foreground">
                  שמור את הנכס ליומן האישי שלך כדי לעקוב אחריו ולקבל עדכונים
                </p>
                <Button onClick={handleSave} className="w-full gap-2">
                  <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "נשמר ביומן - לחץ לצפייה" : "שמור ליומן שלי"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Registration Drawer */}
      <RegistrationDrawer
        open={showRegistration}
        onOpenChange={setShowRegistration}
        onComplete={handleRegistrationComplete}
        propertyId={property?.id || null}
      />
    </div>
  );
};

export default CatalogPropertyDetails;
