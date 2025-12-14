import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, Maximize, Eye, Car, Sun, Shield, FileText, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isPropertyIncomplete } from "@/hooks/usePropertyEnrichment";

interface PropertyCardProps {
  property: {
    id: string;
    address: string;
    city: string;
    price: number;
    size_sqm: number | null;
    rooms: number | null;
    floor: number | null;
    total_floors?: number | null;
    air_directions?: string | null;
    renovation_status?: string | null;
    build_year?: number | null;
    has_elevator?: boolean | null;
    has_balcony?: boolean | null;
    description: string | null;
    has_sun_balcony: boolean | null;
    parking_spots: number | null;
    has_safe_room: boolean | null;
    property_images: Array<{ url: string; is_primary: boolean }>;
    property_documents?: Array<{ id: string; title: string; url: string }>;
  };
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const images = property.property_images.length > 0 
    ? property.property_images 
    : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", is_primary: true }];
  
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const currentImage = sortedImages[selectedImageIndex]?.url;
  const documents = property.property_documents || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : sortedImages.length - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex(prev => prev < sortedImages.length - 1 ? prev + 1 : 0);
  };

  const incomplete = isPropertyIncomplete(property);

  return (
    <Card className="overflow-hidden hover:shadow-medium transition-all duration-300 group cursor-pointer" onClick={() => navigate(`/property/${property.id}`)}>
      <div className="relative h-48 overflow-hidden">
        <img
          src={currentImage}
          alt={property.address}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className="bg-accent text-accent-foreground">
            זמין
          </Badge>
          {incomplete && (
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
              <AlertTriangle className="w-3 h-3" />
              חסר מידע
            </Badge>
          )}
        </div>
        
        {/* Image counter and navigation */}
        {sortedImages.length > 1 && (
          <>
            <Badge className="absolute top-3 left-3 bg-black/60 text-white text-xs">
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
        
        {/* Documents indicator */}
        {documents.length > 0 && (
          <Badge className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground text-xs gap-1">
            <FileText className="w-3 h-3" />
            {documents.length} מסמכים
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1">
              {property.address && property.address !== 'לא צוין' ? property.address : 'נכס'}
              {property.address && property.city && property.city !== 'לא צוין' ? ' - ' : ''}
              {property.city && property.city !== 'לא צוין' ? property.city : ''}
            </h3>
            {property.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {property.description}
              </p>
            )}
          </div>
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
          {property.parking_spots !== null && property.parking_spots > 0 && (
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              <span>{property.parking_spots}</span>
            </div>
          )}
          {property.has_sun_balcony && (
            <div className="flex items-center gap-1">
              <Sun className="w-4 h-4" />
              <span className="sr-only">מרפסת שמש</span>
            </div>
          )}
          {property.has_safe_room && (
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span className="sr-only">ממ״ד</span>
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-primary">
          {formatPrice(property.price)}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full h-10 md:h-11" variant="outline">
          <Eye className="w-4 h-4 ml-2" />
          צפה בפרטים
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
