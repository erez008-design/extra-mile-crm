import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, X, Store, Heart } from "lucide-react";
import CatalogPropertyCard from "@/components/catalog/CatalogPropertyCard";
import RegistrationDrawer from "@/components/catalog/RegistrationDrawer";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface Property {
  id: string;
  address: string;
  city: string;
  neighborhood: string | null;
  price: number | null;
  size_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  has_balcony: boolean | null;
  has_sun_balcony: boolean | null;
  parking_spots: number | null;
  has_safe_room: boolean | null;
  property_type: string | null;
  plot_size_sqm: number | null;
  description: string | null;
  agent_id: string | null;
  property_images: Array<{ url: string; is_primary: boolean }>;
}

const Catalog = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [roomsFilter, setRoomsFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Registration state
  const [showRegistration, setShowRegistration] = useState(false);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  
  // Check if buyer is already registered (from localStorage)
  const [registeredBuyerId, setRegisteredBuyerId] = useState<string | null>(() => {
    return localStorage.getItem("catalog_buyer_id");
  });
  const [registeredBuyerName, setRegisteredBuyerName] = useState<string | null>(() => {
    return localStorage.getItem("catalog_buyer_name");
  });

  // Fetch available properties
  useEffect(() => {
    fetchProperties();
  }, []);

  // Fetch saved properties if buyer is registered
  useEffect(() => {
    if (registeredBuyerId) {
      fetchSavedProperties();
    }
  }, [registeredBuyerId]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (url, is_primary)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedProperties = async () => {
    if (!registeredBuyerId) return;
    
    try {
      const { data, error } = await supabase
        .from("buyer_properties")
        .select("property_id")
        .eq("buyer_id", registeredBuyerId);

      if (error) throw error;
      setSavedPropertyIds(new Set(data?.map(bp => bp.property_id) || []));
    } catch (error) {
      console.error("Error fetching saved properties:", error);
    }
  };

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = properties.map(p => p.city).filter(Boolean);
    return [...new Set(cities)].sort();
  }, [properties]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // City filter
      if (searchCity && !property.city.toLowerCase().includes(searchCity.toLowerCase())) {
        return false;
      }

      // Price filter
      if (priceRange !== "all" && property.price) {
        const [min, max] = priceRange.split("-").map(Number);
        if (property.price < min || (max && property.price > max)) {
          return false;
        }
      }

      // Rooms filter
      if (roomsFilter !== "all" && property.rooms) {
        const minRooms = parseInt(roomsFilter);
        if (roomsFilter.includes("+")) {
          if (property.rooms < minRooms) return false;
        } else {
          if (property.rooms !== minRooms) return false;
        }
      }

      return true;
    });
  }, [properties, searchCity, priceRange, roomsFilter]);

  // Handle save property action
  const handleSaveProperty = async (propertyId: string) => {
    if (!registeredBuyerId) {
      // Not registered - show registration drawer
      setPendingPropertyId(propertyId);
      setShowRegistration(true);
      return;
    }

    // Already registered - save directly
    await savePropertyForBuyer(propertyId, registeredBuyerId);
  };

  // Save property to buyer's journal
  const savePropertyForBuyer = async (propertyId: string, buyerId: string) => {
    try {
      // Check if already saved
      if (savedPropertyIds.has(propertyId)) {
        navigate(`/buyer/${buyerId}`);
        return;
      }

      // Get property details for notification
      const property = properties.find(p => p.id === propertyId);

      // Insert into buyer_properties
      const { error: bpError } = await supabase
        .from("buyer_properties")
        .insert({
          buyer_id: buyerId,
          property_id: propertyId,
          agent_id: property?.agent_id || null,
          status: "interested"
        });

      if (bpError) throw bpError;

      // Log activity
      await supabase.from("activity_logs").insert({
        buyer_id: buyerId,
        agent_id: property?.agent_id || null,
        action_type: "property_saved" as any,
        description: `קונה שמר נכס מהקטלוג: ${property?.address || "נכס"}`,
        metadata: { 
          source: "public_catalog", 
          property_id: propertyId,
          property_address: property?.address
        }
      });

      // Notify listing agent if exists
      if (property?.agent_id) {
        await supabase.from("notifications").insert({
          buyer_id: buyerId,
          agent_id: property.agent_id,
          property_id: propertyId,
          match_score: 100,
          match_reason: "קונה חדש שמר את הנכס מהקטלוג הציבורי"
        });
      }

      // Update saved set
      setSavedPropertyIds(prev => new Set([...prev, propertyId]));

      // Navigate to buyer journal
      navigate(`/buyer/${buyerId}`);
    } catch (error) {
      console.error("Error saving property:", error);
    }
  };

  // Handle successful registration
  const handleRegistrationComplete = async (buyerId: string, buyerName: string) => {
    // Save to localStorage
    localStorage.setItem("catalog_buyer_id", buyerId);
    localStorage.setItem("catalog_buyer_name", buyerName);
    
    setRegisteredBuyerId(buyerId);
    setRegisteredBuyerName(buyerName);
    setShowRegistration(false);

    // Save the pending property if there is one
    if (pendingPropertyId) {
      await savePropertyForBuyer(pendingPropertyId, buyerId);
      setPendingPropertyId(null);
    }
  };

  const clearFilters = () => {
    setSearchCity("");
    setPriceRange("all");
    setRoomsFilter("all");
  };

  const activeFiltersCount = [
    searchCity,
    priceRange !== "all",
    roomsFilter !== "all"
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={extraMileLogo} alt="ExtraMile" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold">קטלוג נכסים</h1>
              <p className="text-xs text-muted-foreground">מצא את הבית המושלם שלך</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {registeredBuyerId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/buyer/${registeredBuyerId}`)}
                className="gap-2"
              >
                <Heart className="w-4 h-4" />
                היומן שלי
                {savedPropertyIds.size > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    {savedPropertyIds.size}
                  </Badge>
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegistration(true)}
              >
                הרשמה
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* City Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חפש עיר..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Price Filter */}
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="טווח מחירים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המחירים</SelectItem>
              <SelectItem value="0-1500000">עד ₪1.5M</SelectItem>
              <SelectItem value="1500000-2500000">₪1.5M - ₪2.5M</SelectItem>
              <SelectItem value="2500000-4000000">₪2.5M - ₪4M</SelectItem>
              <SelectItem value="4000000-6000000">₪4M - ₪6M</SelectItem>
              <SelectItem value="6000000-999999999">מעל ₪6M</SelectItem>
            </SelectContent>
          </Select>

          {/* Rooms Filter */}
          <Select value={roomsFilter} onValueChange={setRoomsFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="חדרים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הגדלים</SelectItem>
              <SelectItem value="2">2 חדרים</SelectItem>
              <SelectItem value="3">3 חדרים</SelectItem>
              <SelectItem value="4">4 חדרים</SelectItem>
              <SelectItem value="5">5 חדרים</SelectItem>
              <SelectItem value="6+">6+ חדרים</SelectItem>
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {filteredProperties.length} נכסים נמצאו
          </p>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="w-3 h-3" />
              {activeFiltersCount} פילטרים פעילים
            </Badge>
          )}
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">לא נמצאו נכסים</h3>
            <p className="text-muted-foreground mb-4">נסה לשנות את הפילטרים</p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                נקה פילטרים
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <CatalogPropertyCard
                key={property.id}
                property={property}
                isSaved={savedPropertyIds.has(property.id)}
                onSave={() => handleSaveProperty(property.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Registration Drawer */}
      <RegistrationDrawer
        open={showRegistration}
        onOpenChange={setShowRegistration}
        onComplete={handleRegistrationComplete}
        propertyId={pendingPropertyId}
      />
    </div>
  );
};

export default Catalog;
