import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Phone, MapPin, Home, Send, ArrowLeft, ArrowRight, Check, X, UserPlus, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatPrice";
import { useNeighborhoods } from "@/hooks/useNeighborhoods";

// 100MB max file size for video support
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const AVAILABLE_CITIES = [
  "רחובות", "נס ציונה", "מזכרת בתיה", "יבנה", "ראשון לציון",
  "תל אביב", "גבעתיים", "רמת גן", "בת ים", "חולון",
  "פתח תקווה", "הרצליה", "רעננה", "כפר סבא", "נתניה",
  "אשדוד", "באר שבע", "ירושלים", "חיפה",
];

const REQUIRED_FEATURES_OPTIONS = [
  { value: "parking_spots", label: "חניה" },
  { value: "has_safe_room", label: 'ממ"ד' },
  { value: "has_elevator", label: "מעלית" },
  { value: "has_sun_balcony", label: "מרפסת שמש" },
];

interface BuyerFormData {
  id?: string;
  full_name: string;
  phone: string;
  target_budget: number | null;
  budget_min: number | null;
  budget_max: number | null;
  target_cities: string[];
  target_neighborhoods: string[];
  min_rooms: number | null;
  required_features: string[];
  isExisting: boolean;
}

interface MatchedProperty {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number;
  size_sqm: number;
  matchScore: number;
  image_url?: string;
}

interface CollaborativeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onComplete: () => void;
}

const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

export const CollaborativeWizard = ({ open, onOpenChange, agentId, onComplete }: CollaborativeWizardProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<BuyerFormData>({
    full_name: "",
    phone: "",
    target_budget: null,
    budget_min: null,
    budget_max: null,
    target_cities: [],
    target_neighborhoods: [],
    min_rooms: null,
    required_features: [],
    isExisting: false,
  });
  const [topMatches, setTopMatches] = useState<MatchedProperty[]>([]);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  
  const { neighborhoodsByCity } = useNeighborhoods();

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setPhoneInput("");
      setNotice(null);
      setFormData({
        full_name: "",
        phone: "",
        target_budget: null,
        budget_min: null,
        budget_max: null,
        target_cities: [],
        target_neighborhoods: [],
        min_rooms: null,
        required_features: [],
        isExisting: false,
      });
      setTopMatches([]);
      setBuyerId(null);
    }
  }, [open]);

  const handlePhoneCheck = async () => {
    const cleaned = cleanPhone(phoneInput);
    if (cleaned.length < 9) {
      toast.error("מספר טלפון לא תקין");
      return;
    }

    setLoading(true);
    try {
      // Search for buyer by phone - try different formats
      const phoneVariants = [
        cleaned,
        cleaned.startsWith("972") ? "0" + cleaned.slice(3) : cleaned,
        cleaned.startsWith("0") ? "972" + cleaned.slice(1) : cleaned,
      ];

      const { data: existingBuyer } = await supabase
        .from("buyers")
        .select("*")
        .or(phoneVariants.map(p => `phone.eq.${p}`).join(","))
        .maybeSingle();

      if (existingBuyer) {
        // Pre-fill ALL fields from existing buyer
        setFormData({
          id: existingBuyer.id,
          full_name: existingBuyer.full_name || "",
          phone: existingBuyer.phone || cleaned,
          target_budget: existingBuyer.target_budget,
          budget_min: existingBuyer.budget_min,
          budget_max: existingBuyer.budget_max,
          target_cities: existingBuyer.target_cities || [],
          target_neighborhoods: existingBuyer.target_neighborhoods || [],
          min_rooms: existingBuyer.min_rooms,
          required_features: existingBuyer.required_features || [],
          isExisting: true,
        });
        setNotice("לקוח קיים במערכת! אתה מצטרף כסוכן. בדוק/עדכן את הקריטריונים.");
        setBuyerId(existingBuyer.id);
      } else {
        setFormData(prev => ({
          ...prev,
          phone: cleaned,
          isExisting: false,
        }));
        setNotice(null);
      }
      setStep(2);
    } catch (error) {
      console.error("Error checking phone:", error);
      toast.error("שגיאה בבדיקת הטלפון");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndMatch = async () => {
    // Validation
    if (!formData.isExisting && !formData.full_name.trim()) {
      toast.error("יש להזין שם מלא");
      return;
    }

    setLoading(true);
    try {
      let currentBuyerId: string;

      if (formData.isExisting && formData.id) {
        // Update existing buyer
        const { error } = await supabase
          .from("buyers")
          .update({
            target_budget: formData.target_budget,
            budget_min: formData.budget_min,
            budget_max: formData.budget_max,
            target_cities: formData.target_cities,
            target_neighborhoods: formData.target_neighborhoods,
            min_rooms: formData.min_rooms,
            required_features: formData.required_features,
          })
          .eq("id", formData.id);

        if (error) throw error;
        currentBuyerId = formData.id;
      } else {
        // Create new buyer
        const { data, error } = await supabase
          .from("buyers")
          .insert({
            full_name: formData.full_name,
            phone: formData.phone,
            target_budget: formData.target_budget,
            budget_min: formData.budget_min,
            budget_max: formData.budget_max,
            target_cities: formData.target_cities,
            target_neighborhoods: formData.target_neighborhoods,
            min_rooms: formData.min_rooms,
            required_features: formData.required_features,
            created_by_agent_id: agentId,
          })
          .select()
          .single();

        if (error) throw error;
        currentBuyerId = data.id;
      }

      setBuyerId(currentBuyerId);

      // Check/create buyer_agents relationship
      const { data: existingRelation } = await supabase
        .from("buyer_agents")
        .select("*")
        .eq("buyer_id", currentBuyerId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (!existingRelation) {
        await supabase.from("buyer_agents").insert({
          buyer_id: currentBuyerId,
          agent_id: agentId,
        });
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        buyer_id: currentBuyerId,
        agent_id: agentId,
        action_type: "criteria_updated",
        description: formData.isExisting
          ? "סוכן עדכן קריטריונים והצטרף ללקוח"
          : "סוכן יצר לקוח חדש וקבע קריטריונים",
        metadata: {
          target_budget: formData.target_budget,
          cities: formData.target_cities,
          min_rooms: formData.min_rooms,
        },
      });

      // Fetch matching properties using local logic
      await fetchMatches(currentBuyerId);
      
      setStep(3);
      toast.success("הנתונים נשמרו בהצלחה!");
    } catch (error) {
      console.error("Error saving buyer:", error);
      toast.error("שגיאה בשמירת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (buyerId: string) => {
    try {
      // Fetch properties with images
      const { data: properties } = await supabase
        .from("properties")
        .select(`
          id, address, city, price, rooms, size_sqm, neighborhood,
          has_safe_room, has_elevator, has_sun_balcony, parking_spots,
          property_images(url, is_primary)
        `)
        .eq("status", "available");

      if (!properties) return;

      // Calculate match scores
      const scored = properties.map(prop => {
        let score = 0;
        const reasons: string[] = [];

        // Budget match (40 points)
        if (formData.target_budget && prop.price) {
          const budgetMin = formData.budget_min || formData.target_budget * 0.8;
          const budgetMax = formData.budget_max || formData.target_budget * 1.2;
          if (prop.price >= budgetMin && prop.price <= budgetMax) {
            score += 40;
            reasons.push("תקציב מתאים");
          }
        }

        // City match (25 points)
        if (formData.target_cities.length > 0 && prop.city) {
          if (formData.target_cities.includes(prop.city)) {
            score += 25;
            reasons.push("עיר מתאימה");
          }
        }

        // Neighborhood match (15 points)
        if (formData.target_neighborhoods.length > 0 && prop.neighborhood) {
          if (formData.target_neighborhoods.includes(prop.neighborhood)) {
            score += 15;
            reasons.push("שכונה מתאימה");
          }
        }

        // Rooms match (10 points)
        if (formData.min_rooms && prop.rooms) {
          if (prop.rooms >= formData.min_rooms) {
            score += 10;
            reasons.push("מספר חדרים מתאים");
          }
        }

        // Features match (10 points)
        if (formData.required_features.length > 0) {
          let featuresMatch = true;
          for (const feature of formData.required_features) {
            if (feature === "parking_spots" && (!prop.parking_spots || prop.parking_spots === 0)) {
              featuresMatch = false;
            }
            if (feature === "has_safe_room" && !prop.has_safe_room) {
              featuresMatch = false;
            }
            if (feature === "has_elevator" && !prop.has_elevator) {
              featuresMatch = false;
            }
            if (feature === "has_sun_balcony" && !prop.has_sun_balcony) {
              featuresMatch = false;
            }
          }
          if (featuresMatch) {
            score += 10;
            reasons.push("מאפיינים מתאימים");
          }
        }

        // Get primary image
        const images = prop.property_images || [];
        const primaryImage = images.find((img: any) => img.is_primary)?.url || images[0]?.url;

        return {
          id: prop.id,
          address: prop.address,
          city: prop.city,
          price: prop.price || 0,
          rooms: prop.rooms || 0,
          size_sqm: prop.size_sqm || 0,
          matchScore: score,
          image_url: primaryImage,
        };
      });

      // Sort by score and take top 3
      const topThree = scored
        .filter(p => p.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);

      setTopMatches(topThree);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!buyerId) return;

    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyerId}`;

    let phone = formData.phone.replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    }

    const message = `היי ${formData.full_name}, הכנתי עבורך רשימת נכסים שמתאימים לך. צפה כאן: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Log activity
    await supabase.from("activity_logs").insert({
      buyer_id: buyerId,
      agent_id: agentId,
      action_type: "whatsapp_sent",
      description: "נשלחה הודעת WhatsApp מתוך האשף המהיר",
    });

    // Update last contact
    await supabase
      .from("buyers")
      .update({ last_contact_date: new Date().toISOString() })
      .eq("id", buyerId);

    window.open(whatsappUrl, "_blank");
    toast.success("נפתח WhatsApp לשליחה");
    onComplete();
    onOpenChange(false);
  };

  const handleFinishWithoutSend = () => {
    toast.success("הלקוח נשמר בהצלחה");
    onComplete();
    onOpenChange(false);
  };

  const toggleCity = (city: string) => {
    setFormData(prev => ({
      ...prev,
      target_cities: prev.target_cities.includes(city)
        ? prev.target_cities.filter(c => c !== city)
        : [...prev.target_cities, city],
    }));
  };

  const toggleNeighborhood = (neighborhood: string) => {
    setFormData(prev => ({
      ...prev,
      target_neighborhoods: prev.target_neighborhoods.includes(neighborhood)
        ? prev.target_neighborhoods.filter(n => n !== neighborhood)
        : [...prev.target_neighborhoods, neighborhood],
    }));
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      required_features: prev.required_features.includes(feature)
        ? prev.required_features.filter(f => f !== feature)
        : [...prev.required_features, feature],
    }));
  };

  // Get neighborhoods for selected cities
  const availableNeighborhoods = formData.target_cities.flatMap(
    city => neighborhoodsByCity[city] || []
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]" dir="rtl">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === 1 && "🔍 חיפוש/יצירת לקוח"}
            {step === 2 && "📋 קריטריוני חיפוש"}
            {step === 3 && "🎯 נכסים מתאימים"}
          </DrawerTitle>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Phone Input */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Phone className="w-12 h-12 mx-auto text-primary" />
                <p className="text-muted-foreground">הזן מספר טלפון של הלקוח</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">מספר טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="050-0000000"
                  className="text-2xl text-center h-14 tracking-wider"
                  dir="ltr"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Criteria */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Existing buyer notice */}
              {notice && (
                <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm">{notice}</p>
                </div>
              )}

              {/* Name - only for new buyers */}
              {!formData.isExisting && (
                <div className="space-y-2">
                  <Label htmlFor="full_name">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="ישראל ישראלי"
                  />
                </div>
              )}

              {/* Budget */}
              <div className="space-y-2">
                <Label>תקציב יעד (₪)</Label>
                <Input
                  type="number"
                  value={formData.target_budget || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null;
                    setFormData(prev => ({
                      ...prev,
                      target_budget: value,
                      budget_min: value ? Math.round(value * 0.8) : null,
                      budget_max: value ? Math.round(value * 1.2) : null,
                    }));
                  }}
                  placeholder="2,000,000"
                  dir="ltr"
                />
                {formData.target_budget && (
                  <p className="text-xs text-muted-foreground">
                    טווח: {formatPrice(formData.budget_min || 0)} - {formatPrice(formData.budget_max || 0)}
                  </p>
                )}
              </div>

              {/* Cities */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  ערים רצויות
                </Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_CITIES.map((city) => (
                    <Badge
                      key={city}
                      variant={formData.target_cities.includes(city) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleCity(city)}
                    >
                      {city}
                      {formData.target_cities.includes(city) && (
                        <X className="w-3 h-3 mr-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Neighborhoods - only show if cities selected */}
              {formData.target_cities.length > 0 && availableNeighborhoods.length > 0 && (
                <div className="space-y-2">
                  <Label>שכונות רצויות</Label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 border rounded-lg">
                    {availableNeighborhoods.map((neighborhood) => (
                      <Badge
                        key={neighborhood}
                        variant={formData.target_neighborhoods.includes(neighborhood) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105 text-xs"
                        onClick={() => toggleNeighborhood(neighborhood)}
                      >
                        {neighborhood}
                        {formData.target_neighborhoods.includes(neighborhood) && (
                          <X className="w-3 h-3 mr-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms */}
              <div className="space-y-2">
                <Label>מינימום חדרים</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={formData.min_rooms || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    min_rooms: e.target.value ? Number(e.target.value) : null,
                  }))}
                  placeholder="3"
                  dir="ltr"
                  className="w-24"
                />
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label>מאפיינים חובה</Label>
                <div className="grid grid-cols-2 gap-2">
                  {REQUIRED_FEATURES_OPTIONS.map((feature) => (
                    <div
                      key={feature.value}
                      className={cn(
                        "flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors",
                        formData.required_features.includes(feature.value)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleFeature(feature.value)}
                    >
                      <Checkbox
                        checked={formData.required_features.includes(feature.value)}
                        onCheckedChange={() => toggleFeature(feature.value)}
                      />
                      <Label className="cursor-pointer text-sm">{feature.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Matches */}
          {step === 3 && (
            <div className="space-y-4">
              {topMatches.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Home className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">לא נמצאו נכסים מתאימים</p>
                  <p className="text-sm text-muted-foreground">
                    הנתונים נשמרו. תוכל לחפש נכסים מאוחר יותר.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    נמצאו {topMatches.length} נכסים מתאימים
                  </p>
                  <div className="space-y-3">
                    {topMatches.map((property) => (
                      <Card key={property.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex gap-3">
                            {/* Image */}
                            <div className="w-24 h-20 bg-muted shrink-0">
                              {property.image_url ? (
                                <img
                                  src={property.image_url}
                                  alt={property.address}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            {/* Details */}
                            <div className="flex-1 py-2 pl-3">
                              <p className="font-medium text-sm line-clamp-1">{property.address}</p>
                              <p className="text-xs text-muted-foreground">{property.city}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-semibold text-primary">
                                  {formatPrice(property.price)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {property.matchScore}% התאמה
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {property.rooms} חד' | {property.size_sqm} מ"ר
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="border-t pt-4">
          {step === 1 && (
            <Button
              onClick={handlePhoneCheck}
              disabled={loading || phoneInput.length < 9}
              className="w-full h-12"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowLeft className="w-5 h-5 ml-2" />
                  המשך
                </>
              )}
            </Button>
          )}

          {step === 2 && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ArrowRight className="w-4 h-4 ml-1" />
                חזור
              </Button>
              <Button
                onClick={handleSaveAndMatch}
                disabled={loading || (!formData.isExisting && !formData.full_name.trim())}
                className="flex-[2]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 ml-2" />
                    מצא התאמות
                  </>
                )}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Button
                onClick={handleSendWhatsApp}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                <Send className="w-5 h-5 ml-2" />
                שלח ב-WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={handleFinishWithoutSend}
                className="w-full"
              >
                <Check className="w-4 h-4 ml-2" />
                סיים בלי לשלוח
              </Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
