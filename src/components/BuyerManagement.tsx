import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Copy, Users, MessageCircle, Plus, Building2, Sparkles, Save, FileText, Upload, Trash2, ExternalLink, Wand2, Filter, Zap, EyeOff, Eye, Info } from "lucide-react";
import { BuyerDetailsDrawer } from "@/components/buyers/BuyerDetailsDrawer";
import { BuyerData } from "@/hooks/useBuyers";
import { BuyerFiltersModal, hasFiltersConfigured } from "./BuyerFiltersModal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeMatches } from "@/hooks/useRealtimeMatches";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { safeDateDisplay } from "@/lib/safeDate";
interface Buyer {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  notes?: string | null;
  global_liked_profile?: string | null;
  global_disliked_profile?: string | null;
  client_match_summary?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  min_rooms?: number | null;
  target_cities?: string[] | null;
  target_neighborhoods?: string[] | null;
  required_features?: string[] | null;
  floor_min?: number | null;
  floor_max?: number | null;
}

interface PropertyDocument {
  id: string;
  title: string;
  url: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number | null;
  property_documents?: PropertyDocument[];
}

interface BuyerWithProperties extends Buyer {
  buyer_properties: Array<{
    id: string;
    property_id: string;
    status: string;
    not_interested_reason: string | null;
    liked_text: string | null;
    disliked_text: string | null;
    properties: Property;
  }>;
}

interface BuyerMessage {
  id: string;
  message: string;
  created_at: string;
  buyer_id: string;
  agent_id: string;
  property_id: string | null;
}

interface TasteProfile {
  global_liked_profile: string;
  global_disliked_profile: string;
  client_match_summary: string;
}

export const BuyerManagement = () => {
  const [buyers, setBuyers] = useState<BuyerWithProperties[]>([]);
  const [messages, setMessages] = useState<BuyerMessage[]>([]);
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [showAddPropertiesToBuyer, setShowAddPropertiesToBuyer] = useState(false);
  const [selectedBuyerForProperties, setSelectedBuyerForProperties] = useState<string | null>(null);
  const [newBuyer, setNewBuyer] = useState({ full_name: "", phone: "", notes: "" });
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [editingTasteProfile, setEditingTasteProfile] = useState<string | null>(null);
  const [tasteProfileForm, setTasteProfileForm] = useState<TasteProfile>({
    global_liked_profile: "",
    global_disliked_profile: "",
    client_match_summary: "",
  });
  const [expandedBuyerProperties, setExpandedBuyerProperties] = useState<Set<string>>(new Set());
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matchingBuyerId, setMatchingBuyerId] = useState<string | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [editingFiltersBuyerId, setEditingFiltersBuyerId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, Array<{
    property_id: string;
    match_score: number;
    match_reason: string;
    property: Property;
  }>>>({});
  
  // Toggle for showing excluded properties per buyer
  const [showExcludedByBuyer, setShowExcludedByBuyer] = useState<Set<string>>(new Set());
  
  // Selected buyer for the drawer
  const [selectedBuyerForDrawer, setSelectedBuyerForDrawer] = useState<BuyerData | null>(null);

  // Get buyer IDs for real-time matches
  const buyerIds = useMemo(() => buyers.map(b => b.id), [buyers]);
  
  // Real-time matches hook - now includes excludedMatches
  const { matches: realtimeMatches, excludedMatches, loading: matchesLoading, triggerMatching } = useRealtimeMatches(buyerIds);
  
  // Toggle excluded view for a buyer
  const toggleExcludedView = (buyerId: string) => {
    setShowExcludedByBuyer(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buyerId)) {
        newSet.delete(buyerId);
      } else {
        newSet.add(buyerId);
      }
      return newSet;
    });
  };

  // Initialize auth and wait for session before fetching data
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) return;
        if (!isMounted) return;
        
        if (session?.user?.id) {
          setAgentId(session.user.id);
        }
      } catch (error) {
        // Auth error - silently fail
      } finally {
        if (isMounted) {
          setTimeout(() => {
            setAuthChecking(false);
          }, 0);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        setAgentId(session.user.id);
        setTimeout(() => {
          setAuthChecking(false);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setAgentId(null);
        setBuyers([]);
        setAuthChecking(false);
      }
    });

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch data only when agentId is available AND authChecking is complete
  useEffect(() => {
    if (!authChecking && agentId) {
      fetchBuyers();
      fetchMessages();
      fetchProperties();
    }
  }, [agentId, authChecking]);

  const fetchBuyers = async () => {
    if (!agentId) return;

    const { data, error } = await supabase
      .from("buyer_agents")
      .select(
        `
        buyer_id,
        buyers (
          id,
          full_name,
          phone,
          created_at,
          notes,
          global_liked_profile,
          global_disliked_profile,
          client_match_summary,
          budget_min,
          budget_max,
          min_rooms,
          target_cities,
          target_neighborhoods,
          required_features,
          floor_min,
          floor_max,
          buyer_properties (
            id,
            property_id,
            status,
            not_interested_reason,
            liked_text,
            disliked_text,
            properties (
              id,
              address,
              city,
              price,
              rooms
            )
          )
        )
      `,
      )
      .eq("agent_id", agentId);

    if (error) {
      toast.error("שגיאה בטעינת קונים");
      return;
    }

    if (data) {
      const buyersList = data.map((item: any) => item.buyers).filter(Boolean);
      setBuyers(buyersList);
    }
  };

  const startEditingTasteProfile = (buyer: BuyerWithProperties) => {
    setEditingTasteProfile(buyer.id);
    setTasteProfileForm({
      global_liked_profile: buyer.global_liked_profile || "",
      global_disliked_profile: buyer.global_disliked_profile || "",
      client_match_summary: buyer.client_match_summary || "",
    });
  };

  const saveTasteProfile = async (buyerId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("buyers")
      .update({
        global_liked_profile: tasteProfileForm.global_liked_profile || null,
        global_disliked_profile: tasteProfileForm.global_disliked_profile || null,
        client_match_summary: tasteProfileForm.client_match_summary || null,
      })
      .eq("id", buyerId);

    if (error) {
      console.error("Error saving taste profile:", error);
      toast.error("שגיאה בשמירת הפרופיל");
    } else {
      toast.success("✔ נשמר למסד הנתונים: פרופיל הטעם נשמר בהצלחה");
      setEditingTasteProfile(null);
      fetchBuyers();
    }
    setLoading(false);
  };

  const [aiLoading, setAiLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (agentId) {
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", agentId);
        const roles = userRoles?.map(r => r.role) || [];
        setIsAdmin(roles.includes("admin"));
      }
    };
    checkAdminRole();
  }, [agentId]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, propertyId: string) => {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;

    setUploadingDocument(propertyId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          title: file.name,
          url: publicUrl,
          file_type: fileExt,
        });

      if (insertError) throw insertError;

      toast.success("המסמך הועלה בהצלחה");
      fetchBuyers();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("שגיאה בהעלאת המסמך");
    } finally {
      setUploadingDocument(null);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string, docUrl: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', docId);

      if (deleteError) throw deleteError;

      const fileName = docUrl.split('/property-documents/')[1];
      if (fileName) {
        await supabase.storage
          .from('property-documents')
          .remove([fileName]);
      }

      toast.success("המסמך נמחק בהצלחה");
      fetchBuyers();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error("שגיאה במחיקת המסמך");
    }
  };

  const handleRemovePropertyFromBuyer = async (buyerPropertyId: string) => {
    if (!confirm("האם אתה בטוח שברצונך להסיר נכס זה מרשימת הקונה?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("buyer_properties")
        .delete()
        .eq("id", buyerPropertyId);

      if (error) throw error;

      toast.success("הנכס הוסר מרשימת הקונה");
      fetchBuyers();
    } catch (error) {
      console.error("Error removing property from buyer:", error);
      toast.error("שגיאה בהסרת הנכס");
    }
  };

  const handleAISuggestion = async (buyerId: string) => {
    if (!buyerId) {
      toast.error("לא נמצא מזהה קונה");
      return;
    }

    setAiLoading(true);
    
    try {
      // Find the buyer and get all their feedback
      const buyer = buyers.find(b => b.id === buyerId);
      if (!buyer || !buyer.buyer_properties) {
        toast.error("לא נמצאו נתוני משוב לניתוח");
        setAiLoading(false);
        return;
      }

      // Collect all feedback from buyer_properties WITH location data
      const feedback = buyer.buyer_properties
        .filter(bp => bp.liked_text || bp.disliked_text || bp.not_interested_reason)
        .map(bp => ({
          liked_text: bp.liked_text,
          disliked_text: bp.disliked_text,
          not_interested_reason: bp.not_interested_reason,
          // Include location data for AI location awareness
          property_address: bp.properties?.address || null,
          property_city: bp.properties?.city || null,
          status: bp.status,
        }));

      if (feedback.length === 0) {
        toast.error("אין מספיק משוב לניתוח. הקונה צריך למלא תובנות על נכסים קודם.");
        setAiLoading(false);
        return;
      }

      console.log("Sending feedback for AI analysis:", feedback);

      // Call the AI extraction edge function
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        "extract-taste-profile",
        { body: { feedback } }
      );

      if (invokeError) {
        console.error("Edge function error:", invokeError);
        toast.error("שגיאה בניתוח AI");
        setAiLoading(false);
        return;
      }
      console.log("AI analysis result:", result);

      if (result.error) {
        toast.error(result.error);
        setAiLoading(false);
        return;
      }

      // Update the form with AI suggestions
      setTasteProfileForm(prev => ({
        ...prev,
        global_liked_profile: result.global_liked_profile || prev.global_liked_profile,
        global_disliked_profile: result.global_disliked_profile || prev.global_disliked_profile,
      }));

      toast.success("ניתוח AI הושלם! עיין בתוצאות ולחץ 'שמור פרופיל' לשמירה.");
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast.error("שגיאה בהפעלת מנוע ה-AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIMatching = async (buyerId: string) => {
    if (!buyerId) {
      toast.error("לא נמצא מזהה קונה");
      return;
    }

    setMatchingBuyerId(buyerId);
    setMatchingLoading(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        "match-properties",
        { body: { buyerId } }
      );

      if (invokeError) {
        console.error("Edge function error:", invokeError);
        toast.error("שגיאה בהתאמת נכסים");
        return;
      }
      console.log("AI matching result:", result);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.matches && result.matches.length > 0) {
        setMatchResults(prev => ({ ...prev, [buyerId]: result.matches }));
        toast.success(`נמצאו ${result.matches.length} נכסים מתאימים!`);
      } else {
        toast.info("לא נמצאו נכסים מתאימים לפרופיל הטעם");
        setMatchResults(prev => ({ ...prev, [buyerId]: [] }));
      }
    } catch (error) {
      console.error("AI matching error:", error);
      toast.error("שגיאה בהפעלת מנוע ההתאמה");
    } finally {
      setMatchingLoading(false);
      setMatchingBuyerId(null);
    }
  };

  const handleAddMatchedProperty = async (buyerId: string, propertyId: string) => {
    if (!agentId) return;

    try {
      const { error } = await supabase.from("buyer_properties").insert({
        buyer_id: buyerId,
        property_id: propertyId,
        agent_id: agentId,
        status: "offered",
      });

      if (error) throw error;

      toast.success("✔ נשמר למסד הנתונים: הנכס נוסף לרשימת הקונה");
      
      // Remove from match results
      setMatchResults(prev => ({
        ...prev,
        [buyerId]: (prev[buyerId] || []).filter(m => m.property_id !== propertyId)
      }));
      
      fetchBuyers();
    } catch (error) {
      console.error("Error adding matched property:", error);
      toast.error("שגיאה בהוספת הנכס");
    }
  };

  const fetchProperties = async () => {
    console.log("[fetchProperties] Fetching all properties...");
    const { data, error } = await supabase
      .from("properties")
      .select("id, address, city, price, rooms")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchProperties] Error:", error);
    } else {
      console.log("[fetchProperties] Loaded", data?.length, "properties");
      setProperties(data || []);
    }
  };

  const fetchMessages = async () => {
    if (!agentId) return;

    const { data } = await supabase
      .from("buyer_messages")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (data) {
      setMessages(data);
    }
  };

  const handleAddBuyer = async () => {
    if (!newBuyer.full_name.trim() || !newBuyer.phone.trim()) {
      toast.error("נא למלא שם מלא ומספר טלפון");
      return;
    }

    if (!agentId) {
      toast.error("לא נמצא מזהה סוכן");
      return;
    }

    if (selectedProperties.length === 0) {
      toast.error("נא לבחור לפחות נכס אחד");
      return;
    }

    setLoading(true);

    try {
      // Check if buyer exists by phone
      const { data: existingBuyer } = await supabase
        .from("buyers")
        .select("*")
        .eq("phone", newBuyer.phone)
        .maybeSingle();

      let buyerId: string;

      if (existingBuyer) {
        // Use existing buyer
        buyerId = existingBuyer.id;

        // Update notes if provided
        if (newBuyer.notes.trim()) {
          await supabase.from("buyers").update({ notes: newBuyer.notes }).eq("id", buyerId);
        }

        toast.success("קונה קיים נמצא במערכת");
      } else {
        // Create new buyer
        console.log("Creating new buyer with agentId:", agentId);
        console.log("Insert payload:", {
          full_name: newBuyer.full_name,
          phone: newBuyer.phone,
          notes: newBuyer.notes || null,
          created_by_agent_id: agentId,
        });
        
        const { data: createdBuyer, error: createError } = await supabase
          .from("buyers")
          .insert({
            full_name: newBuyer.full_name,
            phone: newBuyer.phone,
            notes: newBuyer.notes || null,
            created_by_agent_id: agentId,
          })
          .select()
          .single();

        console.log("Supabase insert response:", { createdBuyer, createError });

        if (createError) {
          console.error("Supabase buyers insert error:", createError);
          toast.error(`שגיאה בהוספת קונה: ${createError.message}`);
          throw createError;
        }

        if (!createdBuyer) {
          console.error("No buyer returned from insert");
          toast.error("שגיאה: לא התקבל מזהה קונה מהשרת");
          throw new Error("No buyer returned from insert");
        }

        buyerId = createdBuyer.id;
        console.log("Buyer created successfully with ID:", buyerId);
        toast.success("✔ נשמר למסד הנתונים: קונה חדש נוצר בהצלחה");
      }

      // Check if relationship already exists
      const { data: existingRelation } = await supabase
        .from("buyer_agents")
        .select("*")
        .eq("buyer_id", buyerId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (!existingRelation) {
        // Create buyer-agent relationship
        console.log("Creating buyer_agents relationship:", { buyer_id: buyerId, agent_id: agentId });
        const { error: baError } = await supabase.from("buyer_agents").insert({
          buyer_id: buyerId,
          agent_id: agentId,
        });
        
        if (baError) {
          console.error("Supabase buyer_agents insert error:", baError);
          toast.error(`שגיאה בקישור סוכן לקונה: ${baError.message}`);
        } else {
          console.log("buyer_agents relationship created successfully");
        }
      }

      // Add selected properties
      const propertyInserts = selectedProperties.map((propertyId) => ({
        buyer_id: buyerId,
        property_id: propertyId,
        agent_id: agentId,
        status: "offered",
      }));

      console.log("Inserting buyer_properties:", propertyInserts);
      const { error: bpError } = await supabase.from("buyer_properties").insert(propertyInserts);
      
      if (bpError) {
        console.error("Supabase buyer_properties insert error:", bpError);
      }

      // Generate and copy link with agent_id
      const buyerLink = `${window.location.origin}/buyer/${buyerId}?agent=${agentId}`;
      navigator.clipboard.writeText(buyerLink);

      toast.success(`✔ נשמר למסד הנתונים: קישור הקונה הועתק! נוצרו ${selectedProperties.length} נכסים.`);

      setShowAddBuyer(false);
      setNewBuyer({ full_name: "", phone: "", notes: "" });
      setSelectedProperties([]);
      fetchBuyers();
    } catch (error: any) {
      console.error("Error adding buyer:", error);
      toast.error("שגיאה: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPropertiesToBuyer = async () => {
    if (!selectedBuyerForProperties || selectedProperties.length === 0) {
      toast.error("נא לבחור נכסים");
      return;
    }

    setLoading(true);

    try {
      const propertyInserts = selectedProperties.map((propertyId) => ({
        buyer_id: selectedBuyerForProperties,
        property_id: propertyId,
        agent_id: agentId,
        status: "offered",
      }));

      await supabase.from("buyer_properties").insert(propertyInserts);

      toast.success(`${selectedProperties.length} נכסים נוספו בהצלחה`);
      setShowAddPropertiesToBuyer(false);
      setSelectedBuyerForProperties(null);
      setSelectedProperties([]);
      fetchBuyers();
    } catch (error: any) {
      console.error("Error adding properties:", error);
      toast.error("שגיאה: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyBuyerLink = (buyerId: string) => {
    const link = `${window.location.origin}/buyer/${buyerId}?agent=${agentId}`;
    navigator.clipboard.writeText(link);
    toast.success("הקישור הועתק ללוח");
  };

  // פונקציה לשליחת וואטסאפ עם רישום פעילות
  const handleSendWhatsApp = async (buyer: Buyer) => {
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;
    
    // ניקוי מספר הטלפון והוספת קידומת ישראל
    let phone = buyer.phone?.replace(/\D/g, "") || "";
    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }
    
    const message = `היי ${buyer.full_name}, הכנתי עבורך רשימת נכסים חדשים שמתאימים לדרישות שלך. אפשר לראות את כל הפרטים והתמונות כאן: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // Log activity to database
    try {
      await supabase.from("activity_logs").insert({
        buyer_id: buyer.id,
        agent_id: agentId,
        action_type: "whatsapp_sent" as any,
        description: "נשלחה הודעת WhatsApp עם קישור לנכסים",
        metadata: { phone, share_url: shareUrl }
      });
    } catch (error) {
      console.error("Failed to log WhatsApp activity:", error);
    }
    
    window.open(whatsappUrl, "_blank");
  };

  // Convert buyer to BuyerData format for drawer
  const openBuyerDrawer = (buyer: BuyerWithProperties) => {
    const buyerData: BuyerData = {
      id: buyer.id,
      full_name: buyer.full_name,
      phone: buyer.phone,
      budget_min: buyer.budget_min ?? null,
      budget_max: buyer.budget_max ?? null,
      target_budget: null,
      target_cities: buyer.target_cities ?? null,
      target_neighborhoods: buyer.target_neighborhoods ?? null,
      min_rooms: buyer.min_rooms ?? null,
      floor_min: buyer.floor_min ?? null,
      floor_max: buyer.floor_max ?? null,
      required_features: buyer.required_features ?? null,
      notes: buyer.notes ?? null,
      created_at: buyer.created_at,
    };
    setSelectedBuyerForDrawer(buyerData);
  };

  const getBuyerStats = (buyer: BuyerWithProperties) => {
    const props = buyer.buyer_properties || [];
    return {
      total: props.length,
      offered: props.filter((p) => p.status === "offered").length,
      interested: props.filter((p) => p.status === "want_to_see").length,
      seen: props.filter((p) => p.status === "seen").length,
      notInterested: props.filter((p) => p.status === "not_interested").length,
    };
  };

  const getBuyerTemperature = (buyer: BuyerWithProperties) => {
    const stats = getBuyerStats(buyer);
    if (stats.interested > 2) return { label: "חם", color: "text-red-600" };
    if (stats.interested > 0 || stats.seen > 0) return { label: "פושר", color: "text-orange-600" };
    return { label: "קר", color: "text-blue-600" };
  };

  // Show loading state while checking auth OR waiting for agentId
  if (authChecking || !agentId) {
    console.log("[render] Showing loading state - authChecking:", authChecking, "agentId:", agentId);
    return (
      <div className="flex items-center justify-center py-12" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">בודק הרשאות...</p>
        </div>
      </div>
    );
  }
  
  console.log("[render] Rendering main UI - agentId:", agentId, "buyers count:", buyers.length);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ניהול קונים
          </CardTitle>
          <Dialog open={showAddBuyer} onOpenChange={setShowAddBuyer}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 ml-2" />
                הוסף קונה + נכסים
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>הוסף קונה חדש ובחר נכסים</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={newBuyer.full_name}
                    onChange={(e) => setNewBuyer({ ...newBuyer, full_name: e.target.value })}
                    placeholder="שם מלא"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">מספר טלפון *</Label>
                  <Input
                    id="phone"
                    value={newBuyer.phone}
                    onChange={(e) => setNewBuyer({ ...newBuyer, phone: e.target.value })}
                    placeholder="05X-XXXXXXX"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">הערות פנימיות</Label>
                  <Textarea
                    id="notes"
                    value={newBuyer.notes}
                    onChange={(e) => setNewBuyer({ ...newBuyer, notes: e.target.value })}
                    placeholder="הערות על הקונה..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>בחר נכסים להציע</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2 mt-2 border rounded-lg p-3 bg-background">
                    {properties.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">אין נכסים זמינים</p>
                    ) : (
                      properties.map((property) => (
                        <div key={property.id} className="flex items-start gap-2 p-2 hover:bg-muted rounded-md">
                          <Checkbox
                            checked={selectedProperties.includes(property.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProperties([...selectedProperties, property.id]);
                              } else {
                                setSelectedProperties(selectedProperties.filter((id) => id !== property.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {property.address}, {property.city}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {property.rooms ? `${property.rooms} חדרים` : 'לא צוין'} • {property.price ? `₪${property.price.toLocaleString()}` : 'לא צוין מחיר'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">נבחרו {selectedProperties.length} נכסים</p>
                </div>
                <Button onClick={handleAddBuyer} disabled={loading} className="w-full">
                  {loading ? "יוצר קישור..." : "צור קונה וקישור (יועתק אוטומטית)"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buyers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">אין קונים עדיין</p>
            ) : (
              buyers.map((buyer) => {
                const stats = getBuyerStats(buyer);
                const temp = getBuyerTemperature(buyer);
                return (
                  <Card key={buyer.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openBuyerDrawer(buyer)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold hover:text-primary transition-colors">{buyer.full_name}</h3>
                          <Badge variant="outline" className={temp.color}>
                            {temp.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {buyer.phone}
                        </p>
                        {buyer.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{buyer.notes}"</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBuyerForProperties(buyer.id);
                            setShowAddPropertiesToBuyer(true);
                          }}
                        >
                          <Plus className="w-4 h-4 ml-1" />
                          הוסף נכסים
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleAIMatching(buyer.id)}
                          disabled={matchingLoading && matchingBuyerId === buyer.id}
                        >
                          <Wand2 className="w-4 h-4 ml-1" />
                          {matchingLoading && matchingBuyerId === buyer.id ? "מחפש..." : "מצא נכסים"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyBuyerLink(buyer.id)}>
                          <Copy className="w-4 h-4 ml-1" />
                          העתק קישור
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleSendWhatsApp(buyer)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <MessageCircle className="w-4 h-4 ml-1" />
                          שלח בוואטסאפ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingFiltersBuyerId(buyer.id)}
                          className="relative"
                        >
                          <Filter className="w-4 h-4 ml-1" />
                          עריכת פילטרים
                          {hasFiltersConfigured(buyer) ? (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" title="פילטרים מוגדרים" />
                          ) : (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title="אין פילטרים" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Filter Status Indicator */}
                    <div className="flex items-center gap-2 text-xs mb-2">
                      {hasFiltersConfigured(buyer) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          🟢 פילטרים מוגדרים
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          🔴 אין פילטרים
                        </Badge>
                      )}
                      {buyer.target_cities && buyer.target_cities.length > 0 && (
                        <span className="text-muted-foreground">
                          ערים: {buyer.target_cities.slice(0, 3).join(", ")}
                          {buyer.target_cities.length > 3 && ` (+${buyer.target_cities.length - 3})`}
                        </span>
                      )}
                      {buyer.target_neighborhoods && buyer.target_neighborhoods.length > 0 && (
                        <span className="text-muted-foreground">
                          שכונות: {buyer.target_neighborhoods.slice(0, 2).join(", ")}
                          {buyer.target_neighborhoods.length > 2 && ` (+${buyer.target_neighborhoods.length - 2})`}
                        </span>
                      )}
                      {(buyer.budget_min || buyer.budget_max) && (
                        <span className="text-muted-foreground">
                          תקציב: {buyer.budget_min ? `₪${buyer.budget_min.toLocaleString('he-IL')}` : '₪0'} – {buyer.budget_max ? `₪${buyer.budget_max.toLocaleString('he-IL')}` : '∞'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="font-semibold">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">סה"כ</div>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{stats.offered}</div>
                        <div className="text-xs text-muted-foreground">הוצעו</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                        <div className="font-semibold text-green-700 dark:text-green-300">{stats.interested}</div>
                        <div className="text-xs text-muted-foreground">מעוניינים</div>
                      </div>
                      <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                        <div className="font-semibold text-purple-700 dark:text-purple-300">{stats.seen}</div>
                        <div className="text-xs text-muted-foreground">נראו</div>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <div className="font-semibold">{stats.notInterested}</div>
                        <div className="text-xs text-muted-foreground">לא רלוונטי</div>
                      </div>
                    </div>

                    {buyer.buyer_properties && buyer.buyer_properties.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium">נכסים ({buyer.buyer_properties.length}):</p>
                          {buyer.buyer_properties.length > 3 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              onClick={() => {
                                setExpandedBuyerProperties(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(buyer.id)) {
                                    newSet.delete(buyer.id);
                                  } else {
                                    newSet.add(buyer.id);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              {expandedBuyerProperties.has(buyer.id) ? "הצג פחות" : `הצג הכל (${buyer.buyer_properties.length})`}
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {(expandedBuyerProperties.has(buyer.id) ? buyer.buyer_properties : buyer.buyer_properties.slice(0, 3)).map((bp) => (
                            <div key={bp.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="font-medium truncate flex-1">{bp.properties.address}, {bp.properties.city}</span>
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {bp.status === "offered" && "הוצע"}
                                    {bp.status === "want_to_see" && "רוצה לראות"}
                                    {bp.status === "seen" && "נראה"}
                                    {bp.status === "interested" && "מעוניין"}
                                    {bp.status === "not_interested" && "לא רלוונטי"}
                                    {bp.status === "offered_price" && "הציע מחיר"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePropertyFromBuyer(bp.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="הסר נכס מרשימת הקונה"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Buyer Insights */}
                              {(bp.not_interested_reason || bp.liked_text || bp.disliked_text) && (
                                <div className="text-xs bg-muted/50 p-2 rounded text-muted-foreground space-y-1">
                                  {bp.not_interested_reason && <div>❌ {bp.not_interested_reason}</div>}
                                  {bp.liked_text && <div>✅ {bp.liked_text}</div>}
                                  {bp.disliked_text && <div>⚠️ {bp.disliked_text}</div>}
                                </div>
                              )}
                              
                              {/* Document Manager */}
                              <div className="border-t pt-2 mt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    מסמכים ({bp.properties.property_documents?.length || 0})
                                  </span>
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                      onChange={(e) => handleDocumentUpload(e, bp.properties.id)}
                                      disabled={uploadingDocument === bp.properties.id}
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      disabled={uploadingDocument === bp.properties.id}
                                      className="h-6 text-xs px-2 gap-1"
                                      asChild
                                    >
                                      <span>
                                        <Upload className="h-3 w-3" />
                                        {uploadingDocument === bp.properties.id ? "מעלה..." : "העלה"}
                                      </span>
                                    </Button>
                                  </label>
                                </div>
                                
                                {bp.properties.property_documents && bp.properties.property_documents.length > 0 ? (
                                  <div className="space-y-1">
                                    {bp.properties.property_documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center justify-between p-2 rounded border bg-background text-xs"
                                      >
                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 flex-1 text-foreground hover:text-primary truncate"
                                        >
                                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{doc.title}</span>
                                        </a>
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteDocument(doc.id, doc.url)}
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-1">אין מסמכים</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Taste Profile Card */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          פרופיל טעם כללי (AI Ready)
                        </p>
                        {editingTasteProfile !== buyer.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => startEditingTasteProfile(buyer)}
                          >
                            עריכה
                          </Button>
                        ) : null}
                      </div>

                      {editingTasteProfile === buyer.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">אהבות כלליות</Label>
                            <Textarea
                              value={tasteProfileForm.global_liked_profile}
                              onChange={(e) =>
                                setTasteProfileForm({ ...tasteProfileForm, global_liked_profile: e.target.value })
                              }
                              placeholder="מה הקונה אוהב בנכסים? (קומה גבוהה, שקט, נוף...)"
                              rows={2}
                              className="text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">פסילות כלליות</Label>
                            <Textarea
                              value={tasteProfileForm.global_disliked_profile}
                              onChange={(e) =>
                                setTasteProfileForm({ ...tasteProfileForm, global_disliked_profile: e.target.value })
                              }
                              placeholder="מה הקונה לא אוהב? (רעש, קומה ראשונה, ללא מעלית...)"
                              rows={2}
                              className="text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">סיכום להתאמה</Label>
                            <Textarea
                              value={tasteProfileForm.client_match_summary}
                              onChange={(e) =>
                                setTasteProfileForm({ ...tasteProfileForm, client_match_summary: e.target.value })
                              }
                              placeholder="סיכום כללי של העדפות הקונה להתאמת נכסים..."
                              rows={2}
                              className="text-sm mt-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveTasteProfile(buyer.id)}
                              disabled={loading}
                              className="flex-1"
                            >
                              <Save className="w-3 h-3 ml-1" />
                              שמור פרופיל
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAISuggestion(buyer.id)}
                              disabled={aiLoading}
                            >
                              <Sparkles className="w-3 h-3 ml-1" />
                              {aiLoading ? "מנתח..." : "הצעת AI לזיקוק טעם"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTasteProfile(null)}
                            >
                              ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs space-y-1 text-muted-foreground">
                          {buyer.global_liked_profile && (
                            <div>✅ <span className="font-medium">אהבות:</span> {buyer.global_liked_profile}</div>
                          )}
                          {buyer.global_disliked_profile && (
                            <div>❌ <span className="font-medium">פסילות:</span> {buyer.global_disliked_profile}</div>
                          )}
                          {buyer.client_match_summary && (
                            <div>📋 <span className="font-medium">סיכום:</span> {buyer.client_match_summary}</div>
                          )}
                          {!buyer.global_liked_profile && !buyer.global_disliked_profile && !buyer.client_match_summary && (
                            <div className="italic">לא הוגדר פרופיל טעם. לחץ על "עריכה" להוספה.</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Real-Time AI Match Results */}
                    {(realtimeMatches[buyer.id]?.length > 0 || excludedMatches[buyer.id]?.length > 0 || (matchResults[buyer.id] && matchResults[buyer.id].length > 0)) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium flex items-center gap-1">
                            {realtimeMatches[buyer.id]?.length > 0 ? (
                              <>
                                <Zap className="w-3 h-3 text-yellow-500" />
                                <span className="text-yellow-600 dark:text-yellow-400">התאמות אוטומטיות</span>
                                <Badge variant="outline" className="text-xs ml-1 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300">
                                  {realtimeMatches[buyer.id].length} נכסים
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3 text-primary" />
                                נכסים מותאמים ({matchResults[buyer.id]?.length || 0})
                              </>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {/* Toggle for excluded properties */}
                            {excludedMatches[buyer.id]?.length > 0 && (
                              <Button
                                size="sm"
                                variant={showExcludedByBuyer.has(buyer.id) ? "secondary" : "outline"}
                                className="h-6 text-xs px-2 gap-1"
                                onClick={() => toggleExcludedView(buyer.id)}
                              >
                                {showExcludedByBuyer.has(buyer.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showExcludedByBuyer.has(buyer.id) ? "הסתר נפסלים" : `הצג נפסלים (${excludedMatches[buyer.id].length})`}
                              </Button>
                            )}
                            {matchResults[buyer.id]?.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2"
                                onClick={() => setMatchResults(prev => ({ ...prev, [buyer.id]: [] }))}
                              >
                                נקה תוצאות
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {/* Show real-time matches first */}
                          {realtimeMatches[buyer.id]?.map((match) => (
                            <div key={match.id} className="border rounded-lg p-3 bg-yellow-50/50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{match.property?.address}, {match.property?.city}</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors">
                                      התאמה {match.match_score}%
                                      <Info className="w-3 h-3 mr-1" />
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-sm" dir="rtl">
                                    <div className="space-y-2">
                                      <h4 className="font-semibold flex items-center gap-1">
                                        <Sparkles className="w-4 h-4" />
                                        פירוט ציון ההתאמה
                                      </h4>
                                      <div className="text-xs text-muted-foreground border-t pt-2">
                                        {match.match_reason ? (
                                          <p className="whitespace-pre-wrap">{match.match_reason}</p>
                                        ) : (
                                          <p className="italic">אין פירוט נוסף</p>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between text-xs font-medium border-t pt-2">
                                        <span>ציון סופי:</span>
                                        <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                                          {match.match_score}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {match.property?.rooms} חדרים • ₪{match.property?.price?.toLocaleString()}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleAddMatchedProperty(buyer.id, match.property_id)}
                                className="w-full h-7 text-xs"
                              >
                                <Plus className="w-3 h-3 ml-1" />
                                הוסף לרשימת הקונה
                              </Button>
                            </div>
                          ))}
                          
                          {/* Show excluded matches when toggle is on */}
                          {showExcludedByBuyer.has(buyer.id) && excludedMatches[buyer.id]?.map((match) => (
                            <div key={match.id} className="border rounded-lg p-3 bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-muted-foreground">{match.property?.address}, {match.property?.city}</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Badge variant="destructive" className="text-xs cursor-pointer hover:opacity-80 transition-opacity">
                                      נפסל (Hard Filter)
                                      <Info className="w-3 h-3 mr-1" />
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-sm" dir="rtl">
                                    <div className="space-y-2">
                                      <h4 className="font-semibold flex items-center gap-1 text-destructive">
                                        <EyeOff className="w-4 h-4" />
                                        סיבת פסילה (Hard Filter)
                                      </h4>
                                      <div className="text-xs text-muted-foreground border-t pt-2">
                                        {match.match_reason ? (
                                          <p className="whitespace-pre-wrap">{match.match_reason}</p>
                                        ) : (
                                          <p className="italic">לא עבר את הפילטרים הקשיחים (תקציב/עיר/שכונה/מאפיינים נדרשים)</p>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground border-t pt-2">
                                        <p><strong>מחיר:</strong> ₪{match.property?.price?.toLocaleString()}</p>
                                        <p><strong>חדרים:</strong> {match.property?.rooms || '-'}</p>
                                        <p><strong>קומה:</strong> {match.property?.floor || '-'}</p>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {match.property?.rooms} חדרים • ₪{match.property?.price?.toLocaleString()}
                              </p>
                              {match.match_reason && (
                                <div className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-2 rounded flex items-start gap-1">
                                  <EyeOff className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{match.match_reason}</span>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Show manual match results */}
                          {matchResults[buyer.id]?.map((match) => (
                            <div key={match.property_id} className="border rounded-lg p-3 bg-primary/5 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{match.property?.address}, {match.property?.city}</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-primary/20 text-primary text-xs cursor-pointer hover:bg-primary/30 transition-colors">
                                      התאמה {match.match_score}%
                                      <Info className="w-3 h-3 mr-1" />
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-sm" dir="rtl">
                                    <div className="space-y-2">
                                      <h4 className="font-semibold flex items-center gap-1">
                                        <Sparkles className="w-4 h-4" />
                                        פירוט ציון ההתאמה
                                      </h4>
                                      <div className="text-xs text-muted-foreground border-t pt-2">
                                        {match.match_reason ? (
                                          <p className="whitespace-pre-wrap">{match.match_reason}</p>
                                        ) : (
                                          <p className="italic">אין פירוט נוסף</p>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between text-xs font-medium border-t pt-2">
                                        <span>ציון סופי:</span>
                                        <Badge className="bg-primary/20 text-primary">
                                          {match.match_score}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {match.property?.rooms} חדרים • ₪{match.property?.price?.toLocaleString()}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleAddMatchedProperty(buyer.id, match.property_id)}
                                className="w-full h-7 text-xs"
                              >
                                <Plus className="w-3 h-3 ml-1" />
                                הוסף לרשימת הקונה
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for adding properties to existing buyer */}
      <Dialog open={showAddPropertiesToBuyer} onOpenChange={setShowAddPropertiesToBuyer}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הוסף נכסים לקונה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>בחר נכסים להוספה</Label>
              <div className="max-h-96 overflow-y-auto space-y-2 mt-2 border rounded-lg p-3">
                {properties.map((property) => {
                  const buyer = buyers.find((b) => b.id === selectedBuyerForProperties);
                  const alreadyAssigned = buyer?.buyer_properties?.some((bp) => bp.property_id === property.id);

                  return (
                    <div key={property.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        disabled={alreadyAssigned}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProperties([...selectedProperties, property.id]);
                          } else {
                            setSelectedProperties(selectedProperties.filter((id) => id !== property.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {property.address}, {property.city}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {property.rooms} חדרים • ₪{property.price.toLocaleString()}
                          {alreadyAssigned && " • כבר הוצע"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">נבחרו {selectedProperties.length} נכסים</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddPropertiesToBuyer}
                disabled={loading || selectedProperties.length === 0}
                className="flex-1"
              >
                {loading ? "מוסיף..." : `הוסף ${selectedProperties.length} נכסים`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddPropertiesToBuyer(false);
                  setSelectedBuyerForProperties(null);
                  setSelectedProperties([]);
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            הודעות מקונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">אין הודעות</p>
            ) : (
                messages.map((msg) => (
                <div key={msg.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">הודעה מלקוח</p>
                      <p className="text-sm text-muted-foreground">
                        מזהה: {msg.buyer_id.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="secondary">{safeDateDisplay(msg.created_at, (d) => d.toLocaleDateString("he-IL"))}</Badge>
                  </div>
                  <p className="text-sm bg-muted p-3 rounded">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buyer Filters Modal */}
      {editingFiltersBuyerId && (() => {
        const selectedBuyer = buyers?.find(b => b.id === editingFiltersBuyerId);
        return selectedBuyer ? (
          <BuyerFiltersModal
            buyerId={editingFiltersBuyerId}
            buyerName={selectedBuyer.full_name || ""}
            initialFilters={{
              budget_min: selectedBuyer.budget_min ?? null,
              budget_max: selectedBuyer.budget_max ?? null,
              target_budget: (selectedBuyer as any).target_budget ?? null,
              min_rooms: selectedBuyer.min_rooms ?? null,
              target_cities: selectedBuyer.target_cities ?? null,
              target_neighborhoods: selectedBuyer.target_neighborhoods ?? null,
              required_features: selectedBuyer.required_features ?? null,
              floor_min: selectedBuyer.floor_min ?? null,
              floor_max: selectedBuyer.floor_max ?? null,
            }}
            open={!!editingFiltersBuyerId}
            onOpenChange={(open) => !open && setEditingFiltersBuyerId(null)}
            onSaved={fetchBuyers}
          />
        ) : null;
      })()}

      {/* Buyer Details Drawer */}
      <BuyerDetailsDrawer
        buyer={selectedBuyerForDrawer}
        open={!!selectedBuyerForDrawer}
        onOpenChange={(open) => !open && setSelectedBuyerForDrawer(null)}
      />
    </div>
  );
};
