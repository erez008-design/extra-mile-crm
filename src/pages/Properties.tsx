import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Building2, Plus, Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
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
  property_type: string | null;
  plot_size_sqm: number | null;
  total_floors: number | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
}

interface Filters {
  search: string;
  priceMin: string;
  priceMax: string;
  rooms: string;
  propertyType: string;
  city: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    priceMin: "",
    priceMax: "",
    rooms: "",
    propertyType: "",
    city: "",
    sortBy: "created_at",
    sortOrder: "desc",
  });

  // Get unique cities for filter dropdown
  const uniqueCities = useMemo(() => {
    const cities = properties.map(p => p.city).filter(Boolean);
    return [...new Set(cities)].sort();
  }, [properties]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Search filter (address or city)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.address?.toLowerCase().includes(searchLower) ||
        p.city?.toLowerCase().includes(searchLower)
      );
    }

    // Price filters
    if (filters.priceMin) {
      result = result.filter(p => p.price >= parseInt(filters.priceMin));
    }
    if (filters.priceMax) {
      result = result.filter(p => p.price <= parseInt(filters.priceMax));
    }

    // Rooms filter
    if (filters.rooms) {
      result = result.filter(p => p.rooms !== null && p.rooms >= parseFloat(filters.rooms));
    }

    // Property type filter
    if (filters.propertyType) {
      result = result.filter(p => p.property_type === filters.propertyType);
    }

    // City filter
    if (filters.city) {
      result = result.filter(p => p.city === filters.city);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (filters.sortBy) {
        case "price":
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case "rooms":
          aVal = a.rooms || 0;
          bVal = b.rooms || 0;
          break;
        case "size":
          aVal = a.size_sqm || 0;
          bVal = b.size_sqm || 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      return filters.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [properties, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    if (filters.rooms) count++;
    if (filters.propertyType) count++;
    if (filters.city) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      search: "",
      priceMin: "",
      priceMax: "",
      rooms: "",
      propertyType: "",
      city: "",
      sortBy: "created_at",
      sortOrder: "desc",
    });
  };

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

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי כתובת או עיר..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pr-10"
              />
            </div>

            {/* Filter Toggle Button */}
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              פילטרים
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary text-primary-foreground h-5 min-w-5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Sort Dropdown */}
            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(val) => {
                const [sortBy, sortOrder] = val.split("-");
                setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as "asc" | "desc" }));
              }}
            >
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="w-4 h-4 ml-2" />
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">החדשים ביותר</SelectItem>
                <SelectItem value="price-asc">מחיר: נמוך לגבוה</SelectItem>
                <SelectItem value="price-desc">מחיר: גבוה לנמוך</SelectItem>
                <SelectItem value="rooms-desc">חדרים: הרבה לקצת</SelectItem>
                <SelectItem value="rooms-asc">חדרים: קצת להרבה</SelectItem>
                <SelectItem value="size-desc">גודל: גדול לקטן</SelectItem>
                <SelectItem value="size-asc">גודל: קטן לגדול</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-4 h-4" />
                נקה פילטרים
              </Button>
            )}
          </div>

          {/* Expandable Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Price Min */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">מחיר מינימום</label>
                <Input
                  type="number"
                  placeholder="₪ מ..."
                  value={filters.priceMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                  dir="ltr"
                />
              </div>

              {/* Price Max */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">מחיר מקסימום</label>
                <Input
                  type="number"
                  placeholder="₪ עד..."
                  value={filters.priceMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  dir="ltr"
                />
              </div>

              {/* Rooms */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">חדרים (מינימום)</label>
                <Select
                  value={filters.rooms}
                  onValueChange={(val) => setFilters(prev => ({ ...prev, rooms: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל מספר חדרים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                    <SelectItem value="6">6+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">סוג נכס</label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(val) => setFilters(prev => ({ ...prev, propertyType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל הסוגים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    <SelectItem value="apartment">דירה</SelectItem>
                    <SelectItem value="private_house">בית פרטי</SelectItem>
                    <SelectItem value="penthouse">פנטהאוז</SelectItem>
                    <SelectItem value="semi_detached">דו-משפחתי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground">עיר</label>
                <Select
                  value={filters.city}
                  onValueChange={(val) => setFilters(prev => ({ ...prev, city: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל הערים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">הכל</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results Count */}
          {!loading && properties.length > 0 && (
            <div className="text-sm text-muted-foreground">
              מציג {filteredProperties.length} מתוך {properties.length} נכסים
            </div>
          )}
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
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">לא נמצאו נכסים</h3>
            <p className="text-muted-foreground mb-4">
              נסה לשנות את הפילטרים או החיפוש
            </p>
            <Button variant="outline" onClick={clearFilters}>
              נקה פילטרים
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
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
