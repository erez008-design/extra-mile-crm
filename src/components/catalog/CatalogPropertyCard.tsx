import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Maximize, 
  Car, 
  Sun, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  HomeIcon, 
  Castle, 
  Warehouse,
  Heart,
  Check
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";

interface CatalogPropertyCardProps {
  property: {
    id: string;
    address: string;
    city: string;
    price: number | null;
    size_sqm: number | null;
    rooms: number | null;
    floor: number | null;
    total_floors: number | null;
    has_elevator: boolean | null;
    has_sun_balcony: boolean | null;
    parking_spots: number | null;
    has_safe_room: boolean | null;
    property_type: string | null;
    plot_size_sqm: number | null;
    description: string | null;
    property_images: Array<{ url: string; is_primary: boolean }>;
  };
  isSaved: boolean;
  onSave: () => void;
}

// Property type configuration
const propertyTypeConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  apartment: { label: "דירה", icon: Building2, className: "bg-blue-500/90 text-white" },
  private_house: { label: "בית פרטי", icon: HomeIcon, className: "bg-green-500/90 text-white" },
  penthouse: { label: "פנטהאוז", icon: Castle, className: "bg-purple-500/90 text-white" },
  semi_detached: { label: "דו-משפחתי", icon: Warehouse, className: "bg-orange-500/90 text-white" },
};

const CatalogPropertyCard = ({ property, isSaved, onSave }: CatalogPropertyCardProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const images = property.property_images.length > 0 
    ? property.property_images 
    : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", is_primary: true }];
  
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const currentImage = sortedImages[selectedImageIndex]?.url;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : sortedImages.length - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => prev < sortedImages.length - 1 ? prev + 1 : 0);
  };

  // Get property type configuration
  const propertyType = property.property_type || "apartment";
  const typeConfig = propertyTypeConfig[propertyType] || propertyTypeConfig.apartment;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="overflow-hidden hover:shadow-medium transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={currentImage}
          alt={property.address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Property Type Badge - Top Left */}
        <Badge className={`absolute top-3 left-3 gap-1 ${typeConfig.className}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </Badge>
        
        {/* City Badge - Top Right */}
        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
          {property.city}
        </Badge>
        
        {/* Image counter and navigation */}
        {sortedImages.length > 1 && (
          <>
            <Badge className="absolute top-10 left-3 bg-black/60 text-white text-xs">
              {selectedImageIndex + 1} / {sortedImages.length}
            </Badge>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="תמונה קודמת"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="תמונה הבאה"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dots indicator */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {sortedImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    selectedImageIndex === idx ? "bg-white w-3" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {property.address || "נכס"}
          </h3>
          {property.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {property.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
          {property.rooms && (
            <div className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>{property.rooms} חדרים</span>
            </div>
          )}
          {property.size_sqm && (
            <div className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              <span>{property.size_sqm} מ"ר</span>
            </div>
          )}
          {/* Show plot size for houses */}
          {(propertyType === "private_house" || propertyType === "semi_detached") && property.plot_size_sqm && (
            <div className="flex items-center gap-1">
              <Maximize className="w-4 h-4 text-green-600" />
              <span>מגרש: {property.plot_size_sqm} מ"ר</span>
            </div>
          )}
          {/* Show floor for apartments/penthouses */}
          {(propertyType === "apartment" || propertyType === "penthouse") && property.floor !== null && (
            <div className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
              קומה {property.floor}{property.total_floors ? ` מתוך ${property.total_floors}` : ''}
            </div>
          )}
          {property.parking_spots !== null && property.parking_spots > 0 && (
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              <span>{property.parking_spots}</span>
            </div>
          )}
          {property.has_sun_balcony && (
            <Sun className="w-4 h-4" />
          )}
          {property.has_safe_room && (
            <Shield className="w-4 h-4" />
          )}
        </div>
        
        <div className="text-2xl font-bold text-primary">
          {property.price ? formatPrice(property.price) : "לא צוין"}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full h-11 gap-2" 
          variant={isSaved ? "secondary" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              נשמר ביומן שלי
            </>
          ) : (
            <>
              <Heart className="w-4 h-4" />
              שמור ליומן שלי
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CatalogPropertyCard;
