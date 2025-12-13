import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Building2, Plus } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";

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
}

const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.user.id)
      .single();

    // Get user role from user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (profile) {
      setUserName(profile.full_name || session.user.email || "");
    }

    if (roles && roles.length > 0) {
      // Use first role (users can have multiple roles)
      setUserRole(roles[0].role);
    }

    fetchProperties();
  };

  const fetchProperties = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_images (
          url,
          is_primary
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת הנכסים");
      console.error(error);
    } else {
      setProperties(data || []);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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
                <h1 className="text-xl font-bold">EXTRAMILE</h1>
                <p className="text-sm text-muted-foreground">הבית שלי</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                שלום, {userName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 ml-2" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">הנכסים שלי</h2>
          <p className="text-muted-foreground">
            כל הנכסים שצפית בהם עם הסוכן שלך
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Building2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">אין נכסים עדיין</h3>
            <p className="text-muted-foreground">
              הסוכן שלך ישלח לך נכסים רלוונטיים בקרוב
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </main>

      {/* Floating action button for agents and admins */}
      {(userRole === "agent" || userRole === "admin") && (
        <Button
          onClick={() => navigate("/agent")}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-medium bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default Properties;
