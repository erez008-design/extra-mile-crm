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
import {
  Heart,
  MessageCircle,
  Eye,
  EyeOff,
  Calendar,
  FileText,
  Wrench,
  Save,
  X,
  AlertCircle,
  GitCompare,
  Images,
  Camera,
  Lock,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { ROICalculator } from "@/components/ROICalculator";
import { TransactionCostCalculator } from "@/components/TransactionCostCalculator";
import { AddPropertyDialog } from "@/components/AddPropertyDialog";
import { safeDateDisplay } from "@/lib/safeDate";
import extraMileLogo from "@/assets/extramile-logo.jpg";
import { PropertyLightbox } from "@/components/buyers/PropertyLightbox";
import { InventoryDiscoveryDrawer } from "@/components/buyers/InventoryDiscoveryDrawer";
import { QuickUploadModal } from "@/components/buyers/QuickUploadModal";
import { Switch } from "@/components/ui/switch";
import { PropertyImageSlider } from "@/components/buyers/PropertyImageSlider";

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
// DB constraint allows: offered, interested, seen, not_interested, want_to_see, offered_price, requested_info
const STATUS_MAP: Record<string, string> = {
  הוצע: "offered",
  נראה: "seen",
  אהבתי: "interested",
  "לא מעוניין": "not_interested",
  "רוצה לראות": "want_to_see",
  "הצעתי מחיר": "offered_price",
  "ביקשתי מידע": "requested_info",
  // Also map English values to themselves for existing data
  offered: "offered",
  seen: "seen",
  interested: "interested",
  not_interested: "not_interested",
  want_to_see: "want_to_see",
  offered_price: "offered_price",
  requested_info: "requested_info",
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
    share_insights_with_agent: boolean;
  }
  const [insightsForms, setInsightsForms] = useState<Record<string, InsightsFormData>>({});
  
  // State for quick upload modal
  const [quickUploadProperty, setQuickUploadProperty] = useState<BuyerProperty | null>(null);

  // Log link view when buyer opens the page
  const logLinkView = async () => {
    if (!buyerId) return;
    try {
      // Get agent_id from buyer_properties if available
      const { data: bpData } = await supabase
        .from("buyer_properties")
        .select("agent_id")
        .eq("buyer_id", buyerId)
        .limit(1)
        .maybeSingle();

      await supabase.from("activity_logs").insert({
        buyer_id: buyerId,
        agent_id: bpData?.agent_id || null,
        action_type: "link_viewed" as any,
        description: "הקונה פתח את קישור הנכסים",
        metadata: { source: "buyer_page", timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error("Failed to log link view:", error);
    }
  };

  useEffect(() => {
    if (buyerId) {
      fetchBuyerData();
      logLinkView(); // Log when buyer opens the page
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
        .maybeSingle();
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
        .select(
          `
          *,
          properties (
            *,
            property_images (url, is_primary)
          )
        `,
        )
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

    const { error } = await supabase.from("buyer_properties").update({ note: noteText }).eq("id", selectedProperty.id);

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

    const { error } = await supabase.from("buyer_messages").insert({
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
      share_insights_with_agent: false,
    };
  };

  const updateInsightsForm = (propertyId: string, field: keyof InsightsFormData, value: string | boolean) => {
    setInsightsForms((prev) => ({
      ...prev,
      [propertyId]: {
        ...getOrInitForm({ id: propertyId } as BuyerProperty),
        ...prev[propertyId],
        [field]: value,
      },
    }));
  };

  const cancelInsights = (buyerPropertyId: string) => {
    setInsightsForms((prev) => {
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
      form.disliked_text !== (buyerProperty.disliked_text || "") ||
      form.share_insights_with_agent !== false
    );
  };

  const initFormIfNeeded = (buyerProperty: BuyerProperty) => {
    if (!insightsForms[buyerProperty.id]) {
      setInsightsForms((prev) => ({
        ...prev,
        [buyerProperty.id]: {
          status: buyerProperty.status || "offered",
          not_interested_reason: buyerProperty.not_interested_reason || "",
          liked_text: buyerProperty.liked_text || "",
          disliked_text: buyerProperty.disliked_text || "",
          share_insights_with_agent: false,
        },
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
    const validStatuses = ["offered", "seen", "interested", "not_interested", "want_to_see", "offered_price", "requested_info"];

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
    
    // Also update share_insights_with_agent directly (RPC doesn't have this param yet)
    if (!error) {
      await supabase
        .from("buyer_properties")
        .update({ share_insights_with_agent: form.share_insights_with_agent })
        .eq("id", buyerPropertyId);
    }

    console.log("Update result - data:", data, "error:", error);

    if (error) {
      console.error("Supabase error saving insights:", error.message, error.code, error);
      toast.error("שגיאה בשמירת התובנות");
    } else if (data === false) {
      toast.error("לא נמצא נכס לעדכון");
    } else {
      // Log status change activity
      try {
        const buyerProperty = buyerProperties.find(bp => bp.id === buyerPropertyId);
        await supabase.from("activity_logs").insert({
          buyer_id: buyerId,
          agent_id: buyerProperty?.agent_id || null,
          action_type: "status_changed" as any,
          description: `הקונה שינה סטטוס נכס ל: ${form.status}`,
          metadata: { 
            property_id: buyerProperty?.property_id,
            old_status: buyerProperty?.status,
            new_status: dbStatus,
            liked_text: form.liked_text || null,
            disliked_text: form.disliked_text || null
          }
        });
      } catch (logError) {
        console.error("Failed to log status change:", logError);
      }

      toast.success("✔ נשמר למסד הנתונים: התובנות נשמרו בהצלחה");
      // Clear the form for this property after saving
      setInsightsForms((prev) => {
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
      requested_info: { label: "ביקשתי מידע", variant: "secondary" },
    };

    const config = statusConfig[status] || statusConfig.offered;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const groupByStatus = () => {
    return {
      offered: buyerProperties.filter((bp) => bp.status === "offered"),
      requested_info: buyerProperties.filter((bp) => bp.status === "requested_info"),
      seen: buyerProperties.filter((bp) => bp.status === "seen"),
      interested: buyerProperties.filter((bp) => bp.status === "interested"),
      not_interested: buyerProperties.filter((bp) => bp.status === "not_interested"),
      want_to_see: buyerProperties.filter((bp) => bp.status === "want_to_see"),
      offered_price: buyerProperties.filter((bp) => bp.status === "offered_price"),
    };
  };

  // State for lightbox
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);

  const renderPropertyCard = (buyerProperty: BuyerProperty) => {
    const property = buyerProperty.properties;
    const images = property.property_images || [];
    const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    // Documents functionality removed - no FK relationship in DB
    const form = insightsForms[buyerProperty.id];
    const isEditing = !!form;
    const unsaved = hasUnsavedChanges(buyerProperty);

    const isSelectedForCompare = selectedForCompare.has(buyerProperty.property_id);

    const toggleCompareSelection = () => {
      setSelectedForCompare((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(buyerProperty.property_id)) {
          newSet.delete(buyerProperty.property_id);
          return newSet;
        } else if (newSet.size < 3) {
          newSet.add(buyerProperty.property_id);
          toast.success("הנכס נוסף להשוואה. בחר נכס נוסף לצפייה בטבלה");
          return newSet;
        } else {
          toast.error("ניתן להשוות עד 3 נכסים");
          return prev;
        }
      });
    };

    return (
      <Card
        key={buyerProperty.id}
        className={`overflow-hidden relative transition-all ${isSelectedForCompare ? "ring-2 ring-primary shadow-lg" : ""}`}
      >
        {/* Image Slider */}
        {sortedImages.length > 0 && (
          <PropertyImageSlider
            images={sortedImages}
            propertyAddress={property.address}
            onImageClick={() => navigate(`/buyer/${buyerId}/property/${buyerProperty.property_id}?bpId=${buyerProperty.id}`)}
            onGalleryClick={() => setLightbox({
              images: sortedImages.map((img) => img.url),
              index: 0,
              title: `${property.address}, ${property.city}`,
            })}
          />
        )}

        <CardContent className="p-4 space-y-3">
          <div
            className="cursor-pointer"
            onClick={() => navigate(`/buyer/${buyerId}/property/${buyerProperty.property_id}?bpId=${buyerProperty.id}`)}
          >
            <h3 className="font-semibold text-lg">{property.address}</h3>
            <p className="text-muted-foreground text-sm">{property.city}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {property.rooms && <Badge variant="outline">{property.rooms} חדרים</Badge>}
            {property.size_sqm && <Badge variant="outline">{property.size_sqm} מ״ר</Badge>}
            {getStatusBadge(buyerProperty.status)}
          </div>

          <p className="text-xl font-bold">
            ₪{property.price?.toLocaleString() || "לא צוין"}
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                setQuickUploadProperty(buyerProperty);
              }}
            >
              <Camera className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">העלה מדיה</span>
            </Button>
            <Button
              size="sm"
              variant={buyerProperty.status === "interested" ? "default" : "outline"}
              className="text-xs px-2"
              onClick={() => updatePropertyStatus(buyerProperty.id, "אהבתי")}
            >
              <Heart className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">אהבתי</span>
            </Button>
            <Button
              size="sm"
              variant={buyerProperty.status === "seen" ? "default" : "outline"}
              className="text-xs px-2"
              onClick={() => updatePropertyStatus(buyerProperty.id, "נראה")}
            >
              <Eye className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">ראיתי</span>
            </Button>
            <Button
              size="sm"
              variant={buyerProperty.status === "not_interested" ? "destructive" : "outline"}
              className="text-xs px-2"
              onClick={() => updatePropertyStatus(buyerProperty.id, "לא מעוניין")}
            >
              <EyeOff className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">לא מעוניין</span>
            </Button>
            <Button
              size="sm"
              variant={isSelectedForCompare ? "default" : "outline"}
              className="text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                toggleCompareSelection();
              }}
            >
              <GitCompare className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">להשוואה</span>
            </Button>
          </div>

          {/* Collapsible Insights Form */}
          <div className="border-t pt-3 mt-3">
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => initFormIfNeeded(buyerProperty)}
              >
                <FileText className="w-4 h-4 ml-2" />
                הוסף תובנות על הנכס
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">התרשמות שלי</Label>
                  {unsaved && (
                    <Badge variant="outline" className="text-orange-500 border-orange-500">
                      <AlertCircle className="w-3 h-3 ml-1" />
                      שינויים לא נשמרו
                    </Badge>
                  )}
                </div>

                <Select
                  value={form?.status || buyerProperty.status || "offered"}
                  onValueChange={(value) => updateInsightsForm(buyerProperty.id, "status", value)}
                >
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
                    <SelectItem value="requested_info">ביקשתי מידע</SelectItem>
                  </SelectContent>
                </Select>

                {form?.status === "not_interested" && (
                  <Textarea
                    placeholder="למה לא מעוניין?"
                    value={form?.not_interested_reason || ""}
                    onChange={(e) => updateInsightsForm(buyerProperty.id, "not_interested_reason", e.target.value)}
                    rows={2}
                  />
                )}

                <Textarea
                  placeholder="מה אהבתי בנכס?"
                  value={form?.liked_text || ""}
                  onChange={(e) => updateInsightsForm(buyerProperty.id, "liked_text", e.target.value)}
                  rows={2}
                />

                <Textarea
                  placeholder="מה לא אהבתי?"
                  value={form?.disliked_text || ""}
                  onChange={(e) => updateInsightsForm(buyerProperty.id, "disliked_text", e.target.value)}
                  rows={2}
                />

                {/* Privacy Toggle */}
                <div className="flex items-start space-x-3 space-x-reverse p-3 bg-muted/30 rounded-lg">
                  <Switch
                    id={`share-insights-${buyerProperty.id}`}
                    checked={form?.share_insights_with_agent || false}
                    onCheckedChange={(checked) => 
                      updateInsightsForm(buyerProperty.id, "share_insights_with_agent", checked)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`share-insights-${buyerProperty.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      שתף תובנות עם הסוכן
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      הסוכן יוכל לראות את התובנות האלו כדי להבין אותך טוב יותר ולהשתפר במציאת התאמות עבורך
                    </p>
                  </div>
                </div>

                {!form?.share_insights_with_agent && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    התובנות שלך פרטיות ונראות רק לך
                  </p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveInsights(buyerProperty.id)} disabled={!unsaved}>
                    <Save className="w-4 h-4 ml-1" />
                    שמור
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancelInsights(buyerProperty.id)}>
                    <X className="w-4 h-4 ml-1" />
                    בטל
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Note & Message */}
          {buyerProperty.note && (
            <div className="bg-muted/50 p-2 rounded text-sm">
              <span className="font-medium">הערה: </span>
              {buyerProperty.note}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedProperty(buyerProperty);
                setNoteText(buyerProperty.note || "");
                setShowNoteDialog(true);
              }}
            >
              <FileText className="w-4 h-4 ml-1" />
              הערה
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedProperty(buyerProperty);
                setShowMessageDialog(true);
              }}
            >
              <MessageCircle className="w-4 h-4 ml-1" />
              הודעה
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">הקונה לא נמצא</p>
        </Card>
      </div>
    );
  }

  const grouped = groupByStatus();
  
  // Properties to exclude from discovery drawer - all properties buyer already has any status for
  const excludedPropertyIds = buyerProperties.map((bp) => bp.property_id);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={extraMileLogo} alt="EXTRAMILE" className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold">{buyer?.full_name ? `שלום, ${buyer.full_name}` : "הבית שלי"}</h1>
              <p className="text-sm text-muted-foreground">EXTRAMILE קשרי נדל"ן</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-xl font-semibold">הנכסים שלי</h2>
            <div className="flex flex-wrap gap-2">
              {/* Persistent Compare Button with Clear */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="rounded-xl relative"
                  onClick={() => {
                    if (selectedForCompare.size >= 2) {
                      navigate(`/compare?buyerId=${buyerId}&properties=${Array.from(selectedForCompare).join(",")}`);
                    } else {
                      toast.info("בחר לפחות 2 נכסים להשוואה");
                    }
                  }}
                >
                  <GitCompare className="w-4 h-4 ml-2" />
                  השוואת נכסים
                  {selectedForCompare.size > 0 && (
                    <Badge 
                      key={selectedForCompare.size}
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
                    >
                      {selectedForCompare.size}
                    </Badge>
                  )}
                </Button>
                {selectedForCompare.size > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => {
                      setSelectedForCompare(new Set());
                      toast.info("הבחירות נוקו");
                    }}
                    title="נקה בחירות"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Inventory Discovery Drawer */}
              <InventoryDiscoveryDrawer
                buyerId={buyer.id}
                buyerAgentId={buyerProperties[0]?.agent_id || null}
                excludedPropertyIds={excludedPropertyIds}
                onRequestComplete={fetchBuyerData}
              />
              
              <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
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
          </div>

          <AddPropertyDialog buyerId={buyer.id} onPropertyAdded={fetchBuyerData} />
        </div>

        <Tabs defaultValue="all" className="w-full">
          {/* Horizontally scrollable tabs for mobile */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-7 gap-1 h-auto flex-nowrap">
              <TabsTrigger value="all" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                הכל ({buyerProperties.length})
              </TabsTrigger>
              <TabsTrigger value="offered" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                הוצעו ({grouped.offered.length})
              </TabsTrigger>
              <TabsTrigger value="requested_info" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                ביקשתי מידע ({grouped.requested_info.length})
              </TabsTrigger>
              <TabsTrigger value="seen" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                נראה ({grouped.seen.length})
              </TabsTrigger>
              <TabsTrigger value="interested" className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                אהבתי ({grouped.interested.length})
              </TabsTrigger>
              <TabsTrigger
                value="not_interested"
                className="flex-shrink-0 px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                לא מעוניין ({grouped.not_interested.length})
              </TabsTrigger>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{buyerProperties.map(renderPropertyCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="offered" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{grouped.offered.map(renderPropertyCard)}</div>
          </TabsContent>

          <TabsContent value="requested_info" className="space-y-4 mt-4">
            {grouped.requested_info.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">לא ביקשת מידע על נכסים עדיין. לחץ על "גלה עוד נכסים" למעלה.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{grouped.requested_info.map(renderPropertyCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="seen" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{grouped.seen.map(renderPropertyCard)}</div>
          </TabsContent>

          <TabsContent value="interested" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{grouped.interested.map(renderPropertyCard)}</div>
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
              onClick={() =>
                navigate(`/compare?buyerId=${buyerId}&properties=${Array.from(selectedForCompare).join(",")}`)
              }
              className="shadow-lg"
            >
              <GitCompare className="w-5 h-5 ml-2" />
              השוואת {selectedForCompare.size} נכסים
            </Button>
          </div>
        )}
        
        {/* Property Lightbox */}
        {lightbox && (
          <PropertyLightbox
            images={lightbox.images}
            initialIndex={lightbox.index}
            open={!!lightbox}
            onOpenChange={(open) => !open && setLightbox(null)}
            title={lightbox.title}
          />
        )}

        {/* Quick Upload Modal */}
        <QuickUploadModal
          buyerId={buyer.id}
          propertyId={quickUploadProperty?.property_id || ""}
          buyerPropertyId={quickUploadProperty?.id}
          propertyAddress={quickUploadProperty?.properties?.address}
          open={!!quickUploadProperty}
          onOpenChange={(open) => !open && setQuickUploadProperty(null)}
          onUploadComplete={() => {
            setQuickUploadProperty(null);
            toast.success("הקובץ הועלה בהצלחה");
          }}
        />
      </main>
    </div>
  );
};

export default Buyer;
