import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, Building2, Plus, Upload, X, Users, Send, RefreshCw, FileText, Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { propertySchema } from "@/lib/validations";
import { BuyerManagement } from "@/components/BuyerManagement";
import { BuyerMessagesTab } from "@/components/BuyerMessagesTab";
import { ExclusionAnalyticsChart } from "@/components/ExclusionAnalyticsChart";
import { subDays } from "date-fns";

interface Client {
  id: string;
  email: string;
  full_name: string | null;
}

const Agent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [exclusionReasons, setExclusionReasons] = useState<Array<{reason: string; count: number}>>([]);
  const [analyticsStartDate, setAnalyticsStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [analyticsEndDate, setAnalyticsEndDate] = useState<Date | null>(new Date());
  const [unassignedProperties, setUnassignedProperties] = useState([]);
  const [claimingPropertyId, setClaimingPropertyId] = useState<string | null>(null);
  
  // Removed old invite system - now using buyer management

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    price: "",
    size_sqm: "",
    rooms: "",
    floor: "",
    has_safe_room: false,
    has_sun_balcony: false,
    parking_spots: "0",
    description: "",
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has agent or admin role
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["agent", "admin"]);

      if (!roles || roles.length === 0) {
        navigate("/");
        return;
      }

      setCurrentUserId(session.user.id);
      fetchProperties();
      fetchUnassignedProperties();
      fetchClients();
      fetchExclusionReasons(session.user.id, subDays(new Date(), 30), new Date());
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchProperties = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch only properties where agent_id matches current user
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("agent_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setProperties(data);
    }
  };

  const fetchUnassignedProperties = async () => {
    // Fetch properties without an agent
    const { data } = await supabase
      .from("properties")
      .select("*")
      .is("agent_id", null)
      .order("created_at", { ascending: false });

    if (data) {
      setUnassignedProperties(data);
    }
  };

  const handleClaimProperty = async (propertyId: string) => {
    if (!currentUserId) return;
    
    setClaimingPropertyId(propertyId);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ agent_id: currentUserId })
        .eq("id", propertyId);

      if (error) throw error;

      toast.success("הנכס שויך אליך בהצלחה");
      fetchProperties();
      fetchUnassignedProperties();
    } catch (error) {
      console.error("Error claiming property:", error);
      toast.error("שגיאה בשיוך הנכס");
    } finally {
      setClaimingPropertyId(null);
    }
  };

  const handleClaimAllProperties = async () => {
    if (!currentUserId || unassignedProperties.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ agent_id: currentUserId })
        .is("agent_id", null);

      if (error) throw error;

      toast.success(`${unassignedProperties.length} נכסים שויכו אליך בהצלחה`);
      fetchProperties();
      fetchUnassignedProperties();
    } catch (error) {
      console.error("Error claiming all properties:", error);
      toast.error("שגיאה בשיוך הנכסים");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    // Get all clients by checking user_roles table
    const { data: clientRoles } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");

    if (clientRoles && clientRoles.length > 0) {
      const clientIds = clientRoles.map((r: any) => r.user_id);
      
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", clientIds);

      if (data) {
        setClients(data);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random()}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Validate property data
      const propertyData = {
        address: formData.address,
        city: formData.city,
        price: parseFloat(formData.price),
        size_sqm: formData.size_sqm ? parseInt(formData.size_sqm) : null,
        rooms: formData.rooms ? parseFloat(formData.rooms) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        has_safe_room: formData.has_safe_room,
        has_sun_balcony: formData.has_sun_balcony,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : null,
        description: formData.description || null,
      };

      const validated = propertySchema.parse(propertyData);

      // Insert property with validated data
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          address: validated.address,
          city: validated.city,
          price: validated.price,
          size_sqm: validated.size_sqm,
          rooms: validated.rooms,
          floor: validated.floor,
          has_safe_room: validated.has_safe_room,
          has_sun_balcony: validated.has_sun_balcony,
          parking_spots: validated.parking_spots,
          description: validated.description,
          created_by: session.user.id,
          agent_id: session.user.id,
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const imageUrl = await uploadFile(images[i], "property-images", property.id);
        
        await supabase.from("property_images").insert({
          property_id: property.id,
          url: imageUrl,
          is_primary: i === 0,
        });
      }

      // Upload documents
      for (const doc of documents) {
        const docUrl = await uploadFile(doc, "property-documents", property.id);
        
        await supabase.from("property_documents").insert({
          property_id: property.id,
          title: doc.name,
          url: docUrl,
          file_type: doc.type,
        });
      }

      toast.success("הנכס נוסף בהצלחה!");
      
      // Reset form
      setFormData({
        address: "",
        city: "",
        price: "",
        size_sqm: "",
        rooms: "",
        floor: "",
        has_safe_room: false,
        has_sun_balcony: false,
        parking_spots: "0",
        description: "",
      });
      setImages([]);
      setDocuments([]);
      
      fetchProperties();
    } catch (error: any) {
      console.error(error);
      if (error.errors) {
        // Zod validation errors
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error("שגיאה בהוספת הנכס: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToClients = async () => {
    if (!selectedProperty || selectedClients.length === 0) {
      toast.error("נא לבחור לקוחות");
      return;
    }

    try {
      for (const clientId of selectedClients) {
        await supabase.from("property_views").insert({
          property_id: selectedProperty,
          client_id: clientId,
        });
      }

      toast.success("הנכס שויך ללקוחות בהצלחה!");
      setShowAssignDialog(false);
      setSelectedProperty(null);
      setSelectedClients([]);
    } catch (error: any) {
      console.error(error);
      toast.error("שגיאה בשיוך הנכס");
    }
  };

  const sendToWebtiv = async (property: any) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("אין הרשאה");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('send-to-webtiv', {
        body: {
          type: 'property',
          propertyData: {
            ...property,
            agent_name: profile?.full_name || 'סוכן',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("הנכס נשלח ל-Webtiv CRM בהצלחה!");
      } else {
        throw new Error(data?.error || 'שגיאה לא ידועה');
      }
    } catch (error: any) {
      console.error("Error sending to Webtiv:", error);
      toast.error("שגיאה בשליחה ל-Webtiv: " + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromWebtiv = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-webtiv');

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `סנכרון הושלם בהצלחה!\n` +
          `נכסים שנוספו: ${data.inserted}\n` +
          `נכסים ללא תמונות: ${data.filtered['no-picture']}\n` +
          `סוכנים שנוספו: ${data.insertedAgents}\n` +
          `תמונות שנוספו: ${data.totalImages}`
        );
        fetchProperties();
      } else {
        throw new Error(data?.error || 'שגיאה לא ידועה');
      }
    } catch (error: any) {
      console.error("Error syncing from Webtiv:", error);
      toast.error("שגיאה בסנכרון מ-Webtiv: " + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      // Delete related records first
      await supabase.from("buyer_properties").delete().eq("property_id", propertyId);
      await supabase.from("property_images").delete().eq("property_id", propertyId);
      await supabase.from("property_documents").delete().eq("property_id", propertyId);
      await supabase.from("matches").delete().eq("property_id", propertyId);
      
      // Delete the property itself
      const { error } = await supabase.from("properties").delete().eq("id", propertyId);
      
      if (error) throw error;
      
      toast.success("הנכס נמחק בהצלחה");
      fetchProperties();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error("שגיאה במחיקת הנכס");
    }
  };

  const fetchExclusionReasons = async (agentId: string, startDate?: Date | null, endDate?: Date | null) => {
    const params: { start_date?: string; end_date?: string; agent_id?: string } = {
      agent_id: agentId
    };
    
    if (startDate) {
      params.start_date = startDate.toISOString();
    }
    if (endDate) {
      params.end_date = endDate.toISOString();
    }
    
    const { data, error } = await supabase.rpc('get_top_exclusion_reasons', params);
    if (data && !error) {
      setExclusionReasons(data);
    }
  };

  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setAnalyticsStartDate(startDate);
    setAnalyticsEndDate(endDate);
    if (currentUserId) {
      fetchExclusionReasons(currentUserId, startDate, endDate);
    }
  };

  // Old invite system completely removed - now using buyer management system

  // Show loading spinner while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">לוח סוכן</h1>
                <p className="text-sm text-muted-foreground">EXTRAMILE</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSyncFromWebtiv}
                disabled={loading}
              >
                <Upload className="w-4 h-4 ml-2" />
                סנכרון מ-Webtiv
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 ml-2" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="add" dir="rtl">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="add">הוספת נכס</TabsTrigger>
            <TabsTrigger value="manage">ניהול נכסים</TabsTrigger>
            <TabsTrigger value="buyers">ניהול קונים</TabsTrigger>
            <TabsTrigger value="messages">הודעות מקונים</TabsTrigger>
            <TabsTrigger value="analytics">אנליטיקס</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>הוספת נכס חדש</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">כתובת *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">עיר *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">מחיר (₪) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size_sqm">גודל (מ"ר)</Label>
                      <Input
                        id="size_sqm"
                        type="number"
                        value={formData.size_sqm}
                        onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rooms">חדרים</Label>
                      <Input
                        id="rooms"
                        type="number"
                        value={formData.rooms}
                        onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor">קומה</Label>
                      <Input
                        id="floor"
                        type="number"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parking_spots">חניות</Label>
                      <Input
                        id="parking_spots"
                        type="number"
                        value={formData.parking_spots}
                        onChange={(e) => setFormData({ ...formData, parking_spots: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="has_safe_room"
                        checked={formData.has_safe_room}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_safe_room: checked as boolean })}
                      />
                      <Label htmlFor="has_safe_room" className="cursor-pointer">ממ״ד</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="has_sun_balcony"
                        checked={formData.has_sun_balcony}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_sun_balcony: checked as boolean })}
                      />
                      <Label htmlFor="has_sun_balcony" className="cursor-pointer">מרפסת שמש</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">תיאור</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="images" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-6 md:p-8 text-center hover:border-primary transition-colors">
                        <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          {images.length > 0 ? `${images.length} תמונות נבחרו` : "לחץ להעלאת תמונות"}
                        </div>
                      </div>
                      <Input
                        id="images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </Label>

                    <Label htmlFor="documents" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-6 md:p-8 text-center hover:border-primary transition-colors">
                        <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          {documents.length > 0 ? `${documents.length} מסמכים נבחרו` : "לחץ להעלאת מסמכים"}
                        </div>
                      </div>
                      <Input
                        id="documents"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={handleDocumentChange}
                        className="hidden"
                      />
                    </Label>

                    <Button type="submit" disabled={loading} className="w-full h-12 text-base">
                      {loading ? "מוסיף..." : "הוסף נכס"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <div className="space-y-6">
              {/* Unassigned Properties Section */}
              {unassignedProperties.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-amber-800">נכסים ללא שיוך ({unassignedProperties.length})</CardTitle>
                    <Button 
                      onClick={handleClaimAllProperties}
                      disabled={loading}
                      size="sm"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Plus className="w-4 h-4 ml-1" />}
                      שייך את כולם אליי
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {unassignedProperties.map((property: any) => (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{property.address}</div>
                            <div className="text-sm text-muted-foreground">{property.city}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-base font-semibold text-primary">
                              {property.price ? `₪${property.price.toLocaleString()}` : 'לא צוין מחיר'}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClaimProperty(property.id)}
                              disabled={claimingPropertyId === property.id}
                            >
                              {claimingPropertyId === property.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 ml-1" />
                                  שייך אליי
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Properties Section */}
              <Card>
                <CardHeader>
                  <CardTitle>הנכסים שלי</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {properties.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">אין נכסים עדיין</p>
                    ) : (
                      properties.map((property: any) => (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/property/${property.id}`)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium">{property.address}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{property.city}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-semibold text-primary">
                              {property.price ? `₪${property.price.toLocaleString()}` : 'לא צוין מחיר'}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendToWebtiv(property)}
                                disabled={loading}
                              >
                                <Send className="w-4 h-4 ml-1" />
                                Webtiv CRM
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property.id);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <Users className="w-4 h-4 ml-1" />
                                שלח ללקוחות
                              </Button>
                              {/* Delete button - only show if agent created this property */}
                              {property.created_by === currentUserId && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent dir="rtl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>מחיקת נכס</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        האם אתה בטוח שברצונך למחוק את הנכס "{property.address}"?
                                        פעולה זו אינה ניתנת לביטול.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-row-reverse gap-2">
                                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteProperty(property.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        מחק נכס
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="buyers">
            <BuyerManagement />
          </TabsContent>

          <TabsContent value="messages">
            <BuyerMessagesTab />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <ExclusionAnalyticsChart 
                data={exclusionReasons} 
                onDateRangeChange={handleDateRangeChange} 
              />
              <Card>
                <CardHeader>
                  <CardTitle>מידע על הנתונים</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    הגרף מציג את 5 הסיבות הנפוצות ביותר לאי-התאמה של נכסים ללקוחות שלך.
                    נתונים אלו יכולים לעזור לך לשפר את ההתאמה בין נכסים לדרישות הלקוחות.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>שיוך נכס ללקוחות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">בחר לקוחות לשיוך הנכס אליהם:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center space-x-2 space-x-reverse p-2 hover:bg-muted rounded">
                    <Checkbox
                      id={client.id}
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClients([...selectedClients, client.id]);
                        } else {
                          setSelectedClients(selectedClients.filter(id => id !== client.id));
                        }
                      }}
                    />
                    <label htmlFor={client.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{client.full_name || client.email}</div>
                      <div className="text-sm text-muted-foreground">{client.email}</div>
                    </label>
                  </div>
                ))}
              </div>
              <Button onClick={handleAssignToClients} className="w-full">
                שייך נכס
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Agent;
