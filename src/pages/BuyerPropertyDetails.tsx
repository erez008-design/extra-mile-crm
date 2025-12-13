import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, MapPin, Home, Maximize, FileText, Heart, Eye, EyeOff, Save, MessageCircle, Building, Car, Bath, Calendar, Thermometer, Info, ChevronLeft, ChevronRight, GitCompare } from "lucide-react";
import { useGetExtendedProperty } from "@/hooks/usePropertyExtendedDetails";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  description: string | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
}

interface BuyerProperty {
  id: string;
  property_id: string;
  agent_id: string;
  status: string;
  note: string | null;
  not_interested_reason: string | null;
  liked_text: string | null;
  disliked_text: string | null;
  properties: Property;
}

const STATUS_MAP: Record<string, string> = {
  "הוצע": "offered",
  "נראה": "seen",
  "אהבתי": "interested",
  "לא מעוניין": "not_interested",
  "רוצה לראות": "want_to_see",
  "הצעתי מחיר": "offered_price",
  "offered": "offered",
  "seen": "seen",
  "interested": "interested",
  "not_interested": "not_interested",
  "want_to_see": "want_to_see",
  "offered_price": "offered_price",
};

const BuyerPropertyDetails = () => {
  const { buyerId, propertyId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bpId = searchParams.get("bpId"); // buyer_property id
  
  const [buyerProperty, setBuyerProperty] = useState<BuyerProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Form state for insights
  const [formStatus, setFormStatus] = useState("offered");
  const [formLiked, setFormLiked] = useState("");
  const [formDisliked, setFormDisliked] = useState("");
  const [formNotInterested, setFormNotInterested] = useState("");
  const [savingInsights, setSavingInsights] = useState(false);
  
  // Extended details
  const { data: extendedDetails, isLoading: loadingExtended } = useGetExtendedProperty(propertyId);

  useEffect(() => {
    if (buyerId && propertyId) {
      fetchBuyerProperty();
    }
  }, [buyerId, propertyId, bpId]);

  const fetchBuyerProperty = async () => {
    setLoading(true);
    
    let query = supabase
      .from("buyer_properties")
      .select(`
        *,
        properties (
          *,
          property_images (url, is_primary)
        )
      `)
      .eq("buyer_id", buyerId)
      .eq("property_id", propertyId);
    
    if (bpId) {
      query = query.eq("id", bpId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching buyer property:", error);
      toast.error("שגיאה בטעינת הנכס");
    } else if (data) {
      setBuyerProperty(data);
      setNoteText(data.note || "");
      setFormStatus(data.status || "offered");
      setFormLiked(data.liked_text || "");
      setFormDisliked(data.disliked_text || "");
      setFormNotInterested(data.not_interested_reason || "");
    }
    
    setLoading(false);
  };

  const saveNote = async () => {
    if (!buyerProperty) return;
    setSavingNote(true);

    const { error } = await supabase
      .from("buyer_properties")
      .update({ note: noteText })
      .eq("id", buyerProperty.id);

    if (error) {
      toast.error("שגיאה בשמירת ההערה");
    } else {
      toast.success("ההערה נשמרה בהצלחה");
      fetchBuyerProperty();
    }
    setSavingNote(false);
  };

  const saveInsights = async () => {
    if (!buyerProperty) return;
    setSavingInsights(true);

    const dbStatus = STATUS_MAP[formStatus] || formStatus;
    
    const { error } = await supabase.rpc("update_buyer_property", {
      p_id: buyerProperty.id,
      p_buyer_id: buyerId,
      p_status: dbStatus,
      p_liked_text: formLiked || null,
      p_disliked_text: formDisliked || null,
      p_not_interested_reason: formNotInterested || null,
    });

    if (error) {
      toast.error("שגיאה בשמירת התובנות");
    } else {
      toast.success("התובנות נשמרו בהצלחה");
      fetchBuyerProperty();
    }
    setSavingInsights(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!buyerProperty) return;
    
    const dbStatus = STATUS_MAP[newStatus] || newStatus;
    
    const { error } = await supabase.rpc("update_buyer_property", {
      p_id: buyerProperty.id,
      p_buyer_id: buyerId,
      p_status: dbStatus,
    });

    if (error) {
      toast.error("שגיאה בעדכון הסטטוס");
    } else {
      toast.success("הסטטוס עודכן בהצלחה");
      fetchBuyerProperty();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      offered: { label: "הוצע", variant: "secondary" },
      seen: { label: "נראה", variant: "outline" },
      interested: { label: "אהבתי", variant: "default" },
      not_interested: { label: "לא מעוניין", variant: "destructive" },
      want_to_see: { label: "רוצה לראות", variant: "default" },
      offered_price: { label: "הצעתי מחיר", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.offered;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  if (!buyerProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">לא נמצא נכס</p>
          <Button className="mt-4" onClick={() => navigate(`/buyer/${buyerId}`)}>
            חזרה לנכסים
          </Button>
        </Card>
      </div>
    );
  }

  const property = buyerProperty.properties;
  const images = property.property_images?.length > 0
    ? property.property_images.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", is_primary: true }];
  const pricePerSqm = property.size_sqm ? Math.round(property.price / property.size_sqm) : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={extraMileLogo} alt="EXTRAMILE" className="w-10 h-10 rounded-lg object-cover" />
              <span className="font-semibold">EXTRAMILE</span>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/buyer/${buyerId}`)}>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לנכסים
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Title & Status */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">{property.address}</h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {property.city}
            </p>
          </div>
          {getStatusBadge(buyerProperty.status)}
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
                </div>
              </CardContent>
            </Card>

            {/* Extended Technical Details */}
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

          </div>

          {/* Right Column - Client Interactions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus("seen")}>
                    <Eye className="w-4 h-4 ml-2" />
                    נראה
                  </Button>
                  <Button size="sm" variant="default" onClick={() => updateStatus("interested")}>
                    <Heart className="w-4 h-4 ml-2" />
                    אהבתי
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus("not_interested")}>
                    <EyeOff className="w-4 h-4 ml-2" />
                    לא מעוניין
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/compare?buyerId=${buyerId}&properties=${propertyId}`)}
                  >
                    <GitCompare className="w-4 h-4 ml-2" />
                    הוסף להשוואה
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Insights Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">תובנות על הנכס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offered">הוצע</SelectItem>
                      <SelectItem value="seen">נראה</SelectItem>
                      <SelectItem value="interested">אהבתי</SelectItem>
                      <SelectItem value="not_interested">לא מעוניין</SelectItem>
                      <SelectItem value="want_to_see">רוצה לראות</SelectItem>
                      <SelectItem value="offered_price">הצעתי מחיר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>מה אהבת?</Label>
                  <Textarea
                    value={formLiked}
                    onChange={(e) => setFormLiked(e.target.value)}
                    placeholder="למשל: מיקום מצוין, מרפסת גדולה..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>מה פחות אהבת?</Label>
                  <Textarea
                    value={formDisliked}
                    onChange={(e) => setFormDisliked(e.target.value)}
                    placeholder="למשל: חניה רחוקה, צריך שיפוצים..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>למה לא מעוניין?</Label>
                  <Textarea
                    value={formNotInterested}
                    onChange={(e) => setFormNotInterested(e.target.value)}
                    placeholder="למשל: רחוק מהעבודה..."
                    rows={2}
                  />
                </div>

                <Button onClick={saveInsights} disabled={savingInsights} className="w-full">
                  <Save className="w-4 h-4 ml-2" />
                  {savingInsights ? "שומר..." : "שמור תובנות"}
                </Button>
              </CardContent>
            </Card>

            {/* Personal Note */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">הערה אישית</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="כתוב הערה אישית על הנכס..."
                  rows={3}
                />
                <Button onClick={saveNote} disabled={savingNote} variant="outline" className="w-full">
                  <Save className="w-4 h-4 ml-2" />
                  {savingNote ? "שומר..." : "שמור הערה"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuyerPropertyDetails;