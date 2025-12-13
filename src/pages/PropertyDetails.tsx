import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  MapPin,
  Home,
  Maximize,
  Layers,
  FileText,
  Star,
  Save,
  Heart,
  X,
  Sun,
  Car,
  Shield,
  Building2,
  Upload,
  Trash2,
} from "lucide-react";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  description: string | null;
  has_sun_balcony: boolean | null;
  parking_spots: number | null;
  has_safe_room: boolean | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
  property_documents: Array<{ id: string; title: string; url: string }>;
}

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isNotRelevant, setIsNotRelevant] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin or agent by querying user_roles table
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const roles = userRoles?.map(r => r.role) || [];
    setIsAdmin(roles.includes("admin") || roles.includes("agent"));

    fetchProperty();
    fetchNoteAndRating();
  };

  const fetchProperty = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images (
          url,
          is_primary
        ),
        property_documents (
          id,
          title,
          url
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("שגיאה בטעינת הנכס");
      console.error(error);
    } else {
      setProperty(data);
    }

    setLoading(false);
  };

  const fetchNoteAndRating = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: noteData } = await supabase
      .from("property_notes")
      .select("note")
      .eq("property_id", id)
      .eq("client_id", session.user.id)
      .maybeSingle();

    if (noteData) {
      setNote(noteData.note);
    }

    const { data: ratingData } = await supabase
      .from("property_ratings")
      .select("rating, is_favorite, is_not_relevant")
      .eq("property_id", id)
      .eq("client_id", session.user.id)
      .maybeSingle();

    if (ratingData) {
      setRating(ratingData.rating || 0);
      setIsFavorite(ratingData.is_favorite || false);
      setIsNotRelevant(ratingData.is_not_relevant || false);
    }
  };

  const saveNote = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSavingNote(true);

    const { error } = await supabase
      .from("property_notes")
      .upsert({
        property_id: id,
        client_id: session.user.id,
        note,
      });

    if (error) {
      toast.error("שגיאה בשמירת ההערה");
    } else {
      toast.success("ההערה נשמרה בהצלחה");
    }

    setSavingNote(false);
  };

  const updateRating = async (newRating: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setRating(newRating);

    const { error } = await supabase
      .from("property_ratings")
      .upsert({
        property_id: id,
        client_id: session.user.id,
        rating: newRating,
        is_favorite: isFavorite,
        is_not_relevant: isNotRelevant,
      });

    if (error) {
      toast.error("שגיאה בשמירת הדירוג");
    }
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newFavorite = !isFavorite;
    setIsFavorite(newFavorite);
    
    // If marking as favorite, remove "not relevant"
    if (newFavorite && isNotRelevant) {
      setIsNotRelevant(false);
    }

    const { error } = await supabase
      .from("property_ratings")
      .upsert({
        property_id: id,
        client_id: session.user.id,
        rating,
        is_favorite: newFavorite,
        is_not_relevant: newFavorite ? false : isNotRelevant,
      });

    if (error) {
      toast.error("שגיאה בשמירה");
    }
  };

  const toggleNotRelevant = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newNotRelevant = !isNotRelevant;
    setIsNotRelevant(newNotRelevant);
    
    // If marking as not relevant, remove favorite
    if (newNotRelevant && isFavorite) {
      setIsFavorite(false);
    }

    const { error } = await supabase
      .from("property_ratings")
      .upsert({
        property_id: id,
        client_id: session.user.id,
        rating,
        is_favorite: newNotRelevant ? false : isFavorite,
        is_not_relevant: newNotRelevant,
      });

    if (error) {
      toast.error("שגיאה בשמירה");
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploadingDocument(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-documents')
        .getPublicUrl(fileName);

      // Insert document record
      const { error: insertError } = await supabase
        .from('property_documents')
        .insert({
          property_id: id,
          title: file.name,
          url: publicUrl,
          file_type: fileExt,
        });

      if (insertError) throw insertError;

      toast.success("המסמך הועלה בהצלחה");
      fetchProperty();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("שגיאה בהעלאת המסמך");
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string, docUrl: string) => {
    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('property_documents')
        .delete()
        .eq('id', docId);

      if (deleteError) throw deleteError;

      // Delete from storage
      const fileName = docUrl.split('/property-documents/')[1];
      if (fileName) {
        await supabase.storage
          .from('property-documents')
          .remove([fileName]);
      }

      toast.success("המסמך נמחק בהצלחה");
      fetchProperty();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error("שגיאה במחיקת המסמך");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">נכס לא נמצא</h2>
          <Button onClick={() => navigate("/")}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  const images = property.property_images.length > 0
    ? property.property_images
    : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", is_primary: true }];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
            <ArrowRight className="w-4 h-4 ml-2" />
            חזרה לרשימה
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Center/Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Description */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">
                {property.address && property.address !== 'לא צוין' ? property.address : 'נכס'}
                {property.address && property.city && property.city !== 'לא צוין' ? ' - ' : ''}
                {property.city && property.city !== 'לא צוין' ? property.city : ''}
              </h1>
              {property.description && (
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {property.description}
                </p>
              )}
            </div>

            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative h-[300px] md:h-[400px] lg:h-[500px]">
                <img
                  src={images[selectedImage].url}
                  alt={property.address}
                  className="w-full h-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto bg-muted/30">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Price - Large and Centered */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-6 md:py-8 text-center">
                <div className="text-sm text-muted-foreground mb-2">מחיר הנכס</div>
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary border-b-2 md:border-b-4 border-primary inline-block pb-2">
                  {formatPrice(property.price)}
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    מסמכים
                  </CardTitle>
                  {isAdmin && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDocument}
                      />
                      <Button 
                        size="sm" 
                        disabled={uploadingDocument}
                        className="gap-2"
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4" />
                          {uploadingDocument ? "מעלה..." : "העלה מסמך"}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </CardHeader>
              {property.property_documents && property.property_documents.length > 0 ? (
                <CardContent>
                  <div className="space-y-2">
                    {property.property_documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1 text-foreground hover:text-primary"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{doc.title}</span>
                        </a>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id, doc.url)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <p className="text-muted-foreground text-sm text-center">אין מסמכים זמינים</p>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar - Property Details Grid */}
          <div className="space-y-6">
            {/* Property Details in Grid */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 md:gap-4">
                  {/* Property Type */}
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Home className="w-8 h-8 mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground mb-1">סוג הנכס</div>
                    <div className="font-semibold text-primary">דירה</div>
                  </div>

                  {/* Transaction Type */}
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Building2 className="w-8 h-8 mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground mb-1">סוג העסקה</div>
                    <div className="font-semibold text-primary">מכירה</div>
                  </div>

                  {/* Size */}
                  {property.size_sqm && (
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                      <Maximize className="w-8 h-8 mb-2 text-primary" />
                      <div className="text-xs text-muted-foreground mb-1">שטח הנכס</div>
                      <div className="font-semibold text-primary">{property.size_sqm} מ״ר</div>
                    </div>
                  )}

                  {/* Floor */}
                  {property.floor !== null && (
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                      <Layers className="w-8 h-8 mb-2 text-primary" />
                      <div className="text-xs text-muted-foreground mb-1">קומה</div>
                      <div className="font-semibold text-primary">{property.floor}</div>
                    </div>
                  )}

                  {/* Parking */}
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Car className="w-8 h-8 mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground mb-1">חניה</div>
                    <div className="font-semibold text-primary">
                      {property.parking_spots && property.parking_spots > 0 ? 'יש' : 'אין'}
                    </div>
                  </div>

                  {/* Rooms */}
                  {property.rooms && (
                    <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                      <Home className="w-8 h-8 mb-2 text-primary" />
                      <div className="text-xs text-muted-foreground mb-1">מספר חדרים</div>
                      <div className="font-semibold text-primary">{property.rooms} חד׳</div>
                    </div>
                  )}

                  {/* Safe Room */}
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Shield className="w-8 h-8 mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground mb-1">ממ״ד</div>
                    <div className="font-semibold text-primary">
                      {property.has_safe_room ? 'יש' : 'אין'}
                    </div>
                  </div>

                  {/* Sun Balcony */}
                  <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                    <Sun className="w-8 h-8 mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground mb-1">מרפסת</div>
                    <div className="font-semibold text-primary">
                      {property.has_sun_balcony ? 'יש' : 'אין'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Selection */}
            <Card>
              <CardHeader>
                <CardTitle>המצב שלי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  className="w-full"
                  onClick={toggleFavorite}
                >
                  <Heart className={`w-4 h-4 ml-2 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "נכס מועדף ❤️" : "סמן כמועדף"}
                </Button>
                <Button
                  variant={isNotRelevant ? "destructive" : "outline"}
                  className="w-full"
                  onClick={toggleNotRelevant}
                >
                  <X className="w-4 h-4 ml-2" />
                  {isNotRelevant ? "סומן כלא רלוונטי" : "לא רלוונטי"}
                </Button>
              </CardContent>
            </Card>

            {/* Rating */}
            <Card>
              <CardHeader>
                <CardTitle>הדירוג שלי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>ההערות שלי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="כתוב כאן את ההערות, החשיבות והחסרונות..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <Button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="w-full"
                >
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

export default PropertyDetails;
