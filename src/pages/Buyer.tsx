import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// CRITICAL: This page is PUBLIC - no auth required
// This flag prevents any accidental auth redirects
const IS_PUBLIC_PAGE = true;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Heart, MessageCircle, Eye, EyeOff, Calendar, FileText, Wrench, Save, X, AlertCircle, GitCompare } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { ROICalculator } from "@/components/ROICalculator";
import { TransactionCostCalculator } from "@/components/TransactionCostCalculator";
import { AddPropertyDialog } from "@/components/AddPropertyDialog";
import { safeDateDisplay } from "@/lib/safeDate";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface Buyer {
  id: string;
  full_name: string;
  phone: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number | null;
  size_sqm: number | null;
  description: string | null;
  property_images: { url: string; is_primary: boolean }[];
}

interface BuyerProperty {
  id: string;
  property_id: string;
  agent_id: string;
  status: string;
  visited_at: string | null;
  note: string | null;
  not_interested_reason: string | null;
  liked_text: string | null;
  disliked_text: string | null;
  properties: Property;
}

// Map Hebrew display labels to English database values
// DB constraint only allows: offered, interested, seen, not_interested, want_to_see, offered_price
const STATUS_MAP: Record<string, string> = {
  "הוצע": "offered",
  "נראה": "seen",
  "אהבתי": "interested",
  "לא מעוניין": "not_interested",
  "רוצה לראות": "want_to_see",
  "הצעתי מחיר": "offered_price",
  // Also map English values to themselves for existing data
  "offered": "offered",
  "seen": "seen",
  "interested": "interested",
  "not_interested": "not_interested",
  "want_to_see": "want_to_see",
  "offered_price": "offered_price",
};

const Buyer = () => {
  const { buyerId } = useParams();
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [buyerProperties, setBuyerProperties] = useState<BuyerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<BuyerProperty | null>(null);
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  // State for property insights forms - indexed by buyerProperty.id
  interface InsightsFormData {
    status: string;
    not_interested_reason: string;
    liked_text: string;
    disliked_text: string;
  }
  const [insightsForms, setInsightsForms] = useState<Record<string, InsightsFormData>>({});

  useEffect(() => {
    if (buyerId) {
      fetchBuyerData();
    }
  }, [buyerId]);

  const fetchBuyerData = async () => {
    setLoading(true);
    
    try {
      // Fetch buyer info
      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("id", buyerId)
        .single();

      if (buyerError) {
        console.error("Error fetching buyer:", buyerError);
        toast.error("שגיאה בטעינת פרטי הקונה");
      } else if (buyerData) {
        setBuyer(buyerData);
        console.log("Buyer data loaded:", buyerData);
      }

      // Fetch buyer properties with property details
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("buyer_properties")
        .select(`
          *,
          properties (
            *,
            property_images (url, is_primary)
          )
        `)
        .eq("buyer_id", buyerId)
        .order("updated_at", { ascending: false });

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        toast.error("שגיאה בטעינת הנכסים");
      } else if (propertiesData) {
        setBuyerProperties(propertiesData);
        console.log("Properties loaded:", propertiesData);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const updatePropertyStatus = async (buyerPropertyId: string, newStatus: string) => {
    const dbStatus = STATUS_MAP[newStatus] || newStatus;
    console.log("Updating status:", { buyerPropertyId, newStatus, dbStatus });
    
    // Use secure RPC function to update - validates buyer_id matches
    const { data, error } = await supabase.rpc("update_buyer_property", {
      p_id: buyerPropertyId,
      p_buyer_id: buyerId,
      p_status: dbStatus,
    });

    if (error) {
      console.error("Error updating status:", error);
      toast.error("שגיאה בעדכון סטטוס הנכס");
    } else if (data === false) {
      toast.error("לא נמצא נכס לעדכון");
    } else {
      toast.success("✔ נשמר למסד הנתונים: הנכס עודכן בהצלחה");
      fetchBuyerData();
    }
  };

  const saveNote = async () => {
    if (!selectedProperty || !noteText.trim()) {
      toast.error("נא למלא הערה");
      return;
    }

    const { error } = await supabase
      .from("buyer_properties")
      .update({ note: noteText })
      .eq("id", selectedProperty.id);

    if (error) {
      toast.error("שגיאה בשמירת ההערה");
    } else {
      toast.success("✔ נשמר למסד הנתונים: ההערה נשמרה בהצלחה");
      setShowNoteDialog(false);
      setNoteText("");
      setSelectedProperty(null);
      fetchBuyerData();
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) {
      toast.error("נא למלא הודעה");
      return;
    }

    // Get agent_id from the first buyer_property
    const agentId = buyerProperties[0]?.agent_id;
    
    if (!agentId) {
      toast.error("לא נמצא סוכן");
      return;
    }

    const { error } = await supabase
      .from("buyer_messages")
      .insert({
        buyer_id: buyerId,
        agent_id: agentId,
        property_id: selectedProperty?.property_id || null,
        message: messageText,
      });

    if (error) {
      toast.error("שגיאה בשליחת ההודעה");
    } else {
      toast.success("✔ נשמר למסד הנתונים: ההודעה נשלחה בהצלחה");
      setShowMessageDialog(false);
      setMessageText("");
      setSelectedProperty(null);
    }
  };

  const getOrInitForm = (buyerProperty: BuyerProperty) => {
    if (insightsForms[buyerProperty.id]) {
      return insightsForms[buyerProperty.id];
    }
    return {
      status: buyerProperty.status || "offered",
      not_interested_reason: buyerProperty.not_interested_reason || "",
      liked_text: buyerProperty.liked_text || "",
      disliked_text: buyerProperty.disliked_text || "",
    };
  };

  const updateInsightsForm = (propertyId: string, field: keyof InsightsFormData, value: string) => {
    setInsightsForms(prev => ({
      ...prev,
      [propertyId]: {
        ...getOrInitForm({ id: propertyId } as BuyerProperty),
        ...prev[propertyId],
        [field]: value,
      }
    }));
  };

  const cancelInsights = (buyerPropertyId: string) => {
    setInsightsForms(prev => {
      const newForms = { ...prev };
      delete newForms[buyerPropertyId];
      return newForms;
    });
    toast.success("השינויים בוטלו");
  };

  const hasUnsavedChanges = (buyerProperty: BuyerProperty): boolean => {
    const form = insightsForms[buyerProperty.id];
    if (!form) return false;
    
    return (
      form.status !== (buyerProperty.status || "offered") ||
      form.not_interested_reason !== (buyerProperty.not_interested_reason || "") ||
      form.liked_text !== (buyerProperty.liked_text || "") ||
      form.disliked_text !== (buyerProperty.disliked_text || "")
    );
  };

  const initFormIfNeeded = (buyerProperty: BuyerProperty) => {
    if (!insightsForms[buyerProperty.id]) {
      setInsightsForms(prev => ({
        ...prev,
        [buyerProperty.id]: {
          status: buyerProperty.status || "offered",
          not_interested_reason: buyerProperty.not_interested_reason || "",
          liked_text: buyerProperty.liked_text || "",
          disliked_text: buyerProperty.disliked_text || "",
        }
      }));
    }
  };

  const saveInsights = async (buyerPropertyId: string) => {
    const form = insightsForms[buyerPropertyId];
    if (!form) {
      toast.error("אין נתונים לשמירה");
      return;
    }
    
    // DIAGNOSTIC LOGS - DO NOT REMOVE UNTIL ROOT CAUSE IS IDENTIFIED
    console.log("========== STATUS DEBUG ==========");
    console.log("RAW FORM STATUS:", form.status);
    console.log("STATUS_MAP RESULT:", STATUS_MAP[form.status]);
    console.log("STATUS_MAP keys:", Object.keys(STATUS_MAP));
    console.log("STATUS_MAP values:", Object.values(STATUS_MAP));
    console.log("===================================");
    
    // Valid database statuses - ONLY these are allowed by DB constraint
    const validStatuses = ["offered", "seen", "interested", "not_interested", "want_to_see", "offered_price"];
    
    // Try to map the status
    let dbStatus = STATUS_MAP[form.status];
    
    // If not found in map, check if it's already a valid English status
    if (!dbStatus && validStatuses.includes(form.status)) {
      dbStatus = form.status;
    }
    
    console.log("FINAL STATUS BEFORE SAVE:", dbStatus);
    console.log("Is valid?:", validStatuses.includes(dbStatus || ""));
    
    // NO FALLBACK - let it fail so we can see the real invalid value
    if (!dbStatus || !validStatuses.includes(dbStatus)) {
      console.error("INVALID STATUS DETECTED - NO FALLBACK APPLIED");
      console.error("form.status:", form.status);
      console.error("dbStatus:", dbStatus);
      toast.error(`סטטוס לא תקין: "${form.status}" -> "${dbStatus}"`);
      return;
    }
    
    console.log("Saving insights for buyerPropertyId:", buyerPropertyId);
    console.log("Form data:", form, "-> dbStatus:", dbStatus);
    
    // Use secure RPC function to update - validates buyer_id matches
    const { data, error } = await supabase.rpc("update_buyer_property", {
      p_id: buyerPropertyId,
      p_buyer_id: buyerId,
      p_status: dbStatus,
      p_liked_text: form.liked_text || null,
      p_disliked_text: form.disliked_text || null,
      p_not_interested_reason: form.not_interested_reason || null,
    });

    console.log("Update result - data:", data, "error:", error);

    if (error) {
      console.error("Supabase error saving insights:", error.message, error.code, error);
      toast.error("שגיאה בשמירת התובנות");
    } else if (data === false) {
      toast.error("לא נמצא נכס לעדכון");
    } else {
      toast.success("✔ נשמר למסד הנתונים: התובנות נשמרו בהצלחה");
      // Clear the form for this property after saving
      setInsightsForms(prev => {
        const newForms = { ...prev };
        delete newForms[buyerPropertyId];
        return newForms;
      });
      fetchBuyerData();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
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

  const groupByStatus = () => {
    return {
      offered: buyerProperties.filter((bp) => bp.status === "offered"),
      seen: buyerProperties.filter((bp) => bp.status === "seen"),
      interested: buyerProperties.filter((bp) => bp.status === "interested"),
      not_interested: buyerProperties.filter((bp) => bp.status === "not_interested"),
      want_to_see: buyerProperties.filter((bp) => bp.status === "want_to_see"),
      offered_price: buyerProperties.filter((bp) => bp.status === "offered_price"),
    };
  };

  // State for image galleries - track selected image per property
  const [selectedImages, setSelectedImages] = useState<Record<string, number>>({});

  const renderPropertyCard = (buyerProperty: BuyerProperty) => {
    const property = buyerProperty.properties;
    const images = property.property_images || [];
    const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    const selectedImageIndex = selectedImages[buyerProperty.id] || 0;
    const currentImage = sortedImages[selectedImageIndex]?.url;
    // Documents functionality removed - no FK relationship in DB
    const form = insightsForms[buyerProperty.id];
    const isEditing = !!form;
    const unsaved = hasUnsavedChanges(buyerProperty);

    const isSelectedForCompare = selectedForCompare.has(buyerProperty.property_id);
    
    const toggleCompareSelection = () => {
      setSelectedForCompare(prev => {
        const newSet = new Set(prev);
        if (newSet.has(buyerProperty.property_id)) {
          newSet.delete(buyerProperty.property_id);
        } else if (newSet.size < 3) {
          newSet.add(buyerProperty.property_id);
        } else {
          toast.error("ניתן להשוות עד 3 נכסים");
        }
        return newSet;
      });
    };

    return (
      <Card key={buyerProperty.id} className={`overflow-hidden relative ${isSelectedForCompare ? 'ring-2 ring-primary' : ''}`}>
        {/* Compare Icon - Top Right of Card */}
        <div 
          onClick={(e) => { e.stopPropagation(); toggleCompareSelection(); }}
          className={`absolute top-3 right-3 z-20 p-2 rounded-lg cursor-pointer transition-all shadow-md ${isSelectedForCompare ? 'bg-primary text-primary-foreground scale-110' : 'bg-black/60 text-white hover:bg-black/80'}`}
          title="השוואה"
        >
          <GitCompare className="w-5 h-5" />
        </div>
        {/* Image Gallery */}
        {sortedImages.length > 0 && (
          <div className="relative" onClick={() => navigate(`/buyer/${buyerId}/property/${buyerProperty.property_id}?bpId=${buyerProperty.id}`)}>
            <img 
              src={currentImage} 
              alt={property.address} 
              className="w-full h-48 object-cover"
            />
            {/* Image navigation dots */}
            {sortedImages.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {sortedImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImages(prev => ({ ...prev, [buyerProperty.id]: idx }));
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      selectedImageIndex === idx 
                        ? "bg-primary w-4" 
                        : "bg-white/70 hover:bg-white"
                    }`}
                    aria-label={`תמונה ${idx + 1}`}
                  />
                ))}
              </div>
            )}
            {/* Image counter badge */}
            {sortedImages.length > 1 && (
              <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                {selectedImageIndex + 1} / {sortedImages.length}
              </Badge>
            )}
            {/* Navigation arrows for mobile */}
            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImages(prev => ({
                      ...prev,
                      [buyerProperty.id]: selectedImageIndex > 0 ? selectedImageIndex - 1 : sortedImages.length - 1
                    }));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                  aria-label="תמונה קודמת"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImages(prev => ({
                      ...prev,
                      [buyerProperty.id]: selectedImageIndex < sortedImages.length - 1 ? selectedImageIndex + 1 : 0
                    }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                  aria-label="תמונה הבאה"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg">{property.address}</h3>
              <p className="text-sm text-muted-foreground">{property.city}</p>
            </div>
            {getStatusBadge(buyerProperty.status)}
          </div>
          
          <div className="flex gap-4 text-sm text-muted-foreground mb-3">
            {property.rooms && <span>{property.rooms} חדרים</span>}
            {property.size_sqm && <span>{property.size_sqm} מ״ר</span>}
            <span className="font-semibold text-foreground">
              ₪{property.price.toLocaleString()}
            </span>
          </div>

          {buyerProperty.visited_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="w-4 h-4" />
              <span>נראה בתאריך: {safeDateDisplay(buyerProperty.visited_at, (d) => format(d, "d MMMM yyyy", { locale: he }))}</span>
            </div>
          )}

          {buyerProperty.note && (
            <div className="bg-muted p-3 rounded-md mb-3">
              <p className="text-sm">{buyerProperty.note}</p>
            </div>
          )}

          {/* Documents section removed - no FK relationship in DB */}

          {/* Property Insights Form */}
          <Card className={`border-2 mb-3 ${unsaved ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : 'border-primary/20'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  תובנות על הנכס
                  {unsaved && (
                    <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs">
                      <AlertCircle className="w-3 h-3 ml-1" />
                      שינויים לא נשמרו
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`status-${buyerProperty.id}`}>סטטוס</Label>
                <Select
                  value={isEditing ? form.status : buyerProperty.status}
                  onValueChange={(value) => {
                    initFormIfNeeded(buyerProperty);
                    updateInsightsForm(buyerProperty.id, "status", value);
                  }}
                >
                  <SelectTrigger id={`status-${buyerProperty.id}`}>
                    <SelectValue placeholder="בחר סטטוס" />
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
                <Label htmlFor={`not-interested-${buyerProperty.id}`}>למה לא מעוניין?</Label>
                <Textarea
                  id={`not-interested-${buyerProperty.id}`}
                  value={isEditing ? form.not_interested_reason : buyerProperty.not_interested_reason || ""}
                  onChange={(e) => {
                    initFormIfNeeded(buyerProperty);
                    updateInsightsForm(buyerProperty.id, "not_interested_reason", e.target.value);
                  }}
                  placeholder="למשל: רחוק מהעבודה, קומה גבוהה מדי..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`liked-${buyerProperty.id}`}>מה אהבת?</Label>
                <Textarea
                  id={`liked-${buyerProperty.id}`}
                  value={isEditing ? form.liked_text : buyerProperty.liked_text || ""}
                  onChange={(e) => {
                    initFormIfNeeded(buyerProperty);
                    updateInsightsForm(buyerProperty.id, "liked_text", e.target.value);
                  }}
                  placeholder="למשל: מיקום מצוין, מרפסת גדולה..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`disliked-${buyerProperty.id}`}>מה פחות אהבת?</Label>
                <Textarea
                  id={`disliked-${buyerProperty.id}`}
                  value={isEditing ? form.disliked_text : buyerProperty.disliked_text || ""}
                  onChange={(e) => {
                    initFormIfNeeded(buyerProperty);
                    updateInsightsForm(buyerProperty.id, "disliked_text", e.target.value);
                  }}
                  placeholder="למשל: חניה רחוקה, צריך שיפוצים..."
                  rows={2}
                />
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveInsights(buyerProperty.id)}
                    className="flex-1"
                    size="sm"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    שמור תובנות
                  </Button>
                  <Button
                    onClick={() => cancelInsights(buyerProperty.id)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updatePropertyStatus(buyerProperty.id, "seen")}
            >
              <Eye className="w-4 h-4 ml-2" />
              נראה
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => updatePropertyStatus(buyerProperty.id, "interested")}
            >
              <Heart className="w-4 h-4 ml-2" />
              אהבתי
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updatePropertyStatus(buyerProperty.id, "not_interested")}
            >
              <EyeOff className="w-4 h-4 ml-2" />
              לא מעוניין
            </Button>
            <Button
              size="sm"
              variant={isSelectedForCompare ? "default" : "outline"}
              onClick={(e) => { e.stopPropagation(); toggleCompareSelection(); }}
              title="השוואה"
            >
              <GitCompare className="w-4 h-4 ml-2" />
              השוואה
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedProperty(buyerProperty);
                setNoteText(buyerProperty.note || "");
                setShowNoteDialog(true);
              }}
            >
              הערה
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedProperty(buyerProperty);
                setShowMessageDialog(true);
              }}
            >
              <MessageCircle className="w-4 h-4 ml-2" />
              שלח הודעה לסוכן
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>טוען...</p>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">לא נמצא קונה עם מזהה זה</p>
        </Card>
      </div>
    );
  }

  const grouped = groupByStatus();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={extraMileLogo} alt="EXTRAMILE" className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold">
                {buyer?.full_name ? `שלום, ${buyer.full_name}` : "הבית שלי"}
              </h1>
              <p className="text-sm text-muted-foreground">EXTRAMILE קשרי נדל"ן</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">הנכסים שלי</h2>
            <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 ml-2" />
                  שלח הודעה לסוכן
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>שלח הודעה לסוכן</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="כתוב הודעה לסוכן..."
                  rows={5}
                  maxLength={300}
                />
                <Button onClick={sendMessage}>שלח</Button>
              </DialogContent>
            </Dialog>
          </div>

          <AddPropertyDialog buyerId={buyer.id} onPropertyAdded={fetchBuyerData} />
        </div>

        <Tabs defaultValue="all" className="w-full">
          {/* Horizontally scrollable tabs for mobile */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 gap-1 h-auto flex-nowrap">
              <TabsTrigger value="all" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">הכל ({buyerProperties.length})</TabsTrigger>
              <TabsTrigger value="offered" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">הוצעו ({grouped.offered.length})</TabsTrigger>
              <TabsTrigger value="seen" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">נראה ({grouped.seen.length})</TabsTrigger>
              <TabsTrigger value="interested" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">אהבתי ({grouped.interested.length})</TabsTrigger>
              <TabsTrigger value="not_interested" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">לא מעוניין ({grouped.not_interested.length})</TabsTrigger>
              <TabsTrigger value="tools" className="flex-shrink-0 px-3 py-2">
                <Wrench className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-4 mt-4">
            {buyerProperties.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">עדיין לא הוצעו לך נכסים</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buyerProperties.map(renderPropertyCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offered" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.offered.map(renderPropertyCard)}
            </div>
          </TabsContent>

          <TabsContent value="seen" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.seen.map(renderPropertyCard)}
            </div>
          </TabsContent>

          <TabsContent value="interested" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.interested.map(renderPropertyCard)}
            </div>
          </TabsContent>

          <TabsContent value="not_interested" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grouped.not_interested.map(renderPropertyCard)}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-4">
            <div className="max-w-md mx-auto space-y-6">
              <MortgageCalculator />
              <ROICalculator />
              <TransactionCostCalculator />
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוסף הערה לנכס</DialogTitle>
            </DialogHeader>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="כתוב הערה על הנכס..."
              rows={5}
              maxLength={300}
            />
            <Button onClick={saveNote}>שמור הערה</Button>
          </DialogContent>
        </Dialog>

        {/* Floating Compare Button */}
        {selectedForCompare.size >= 2 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Button 
              size="lg" 
              onClick={() => navigate(`/compare?buyerId=${buyerId}&properties=${Array.from(selectedForCompare).join(',')}`)}
              className="shadow-lg"
            >
              <GitCompare className="w-5 h-5 ml-2" />
              השוואת {selectedForCompare.size} נכסים
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Buyer;
