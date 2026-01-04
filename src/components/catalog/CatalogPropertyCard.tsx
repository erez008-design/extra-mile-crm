import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Bed, 
  ChevronLeft, 
  ChevronRight, 
  Heart,
  Maximize2
} from "lucide-react";

interface CatalogPropertyCardProps {
  property: {
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

// Property type labels in Hebrew
const propertyTypeLabels: Record<string, string> = {
  apartment: "דירה",
  private_house: "בית",
  penthouse: "פנטהאוז",
  semi_detached: "דו-משפחתי",
  cottage: "קוטג'",
  garden_apartment: "גן",
  mini_penthouse: "מיני פנטי'",
};

const CatalogPropertyCard = ({ property, isSaved, onSave }: CatalogPropertyCardProps) => {
  const navigate = useNavigate();
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

  // Get property type label
  const propertyType = property.property_type || "apartment";
  const typeLabel = propertyTypeLabels[propertyType] || propertyTypeLabels.apartment;

  // Format price with commas
  const formatPrice = (price: number) => {
    return price.toLocaleString('he-IL');
  };

  // Build location string: City | Neighborhood | Type
  const locationParts = [
    property.city,
    property.neighborhood || undefined,
    typeLabel
  ].filter(Boolean);
  const locationString = locationParts.join(" | ");

  // Parking text
  const getParkingText = () => {
    if (property.parking_spots === null || property.parking_spots === 0) {
      return "אין";
    }
    return "יש";
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to public property details page
    navigate(`/catalog/${property.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Section */}
      <div className="relative h-52 overflow-hidden group">
        <img
          src={currentImage}
          alt={property.address}
          className="w-full h-full object-cover"
        />
        
        {/* Heart/Save Icon - Top Right of Image */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isSaved 
              ? "bg-red-500 text-white" 
              : "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500"
          }`}
          aria-label={isSaved ? "נשמר" : "שמור ליומן"}
        >
          <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
        </button>
        
        {/* Image Navigation */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              aria-label="תמונה קודמת"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              aria-label="תמונה הבאה"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dots indicator */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {sortedImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    selectedImageIndex === idx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Location Info Row */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-center text-[#00a0e3] font-medium text-base">
          {locationString}
        </p>
      </div>
      
      {/* Icons Row */}
      <div className="px-4 py-3 flex items-center justify-center gap-6 border-b border-gray-100">
        {/* Parking */}
        <div className="flex flex-col items-center gap-1">
          <Car className="w-6 h-6 text-[#00a0e3]" />
          <span className="text-xs text-gray-600">{getParkingText()}</span>
        </div>
        
        {/* Area */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <Maximize2 className="w-6 h-6 text-[#00a0e3]" />
          </div>
          <span className="text-xs text-gray-600">
            {property.size_sqm ? `${property.size_sqm} מ"ר` : "-"}
          </span>
        </div>
        
        {/* Rooms */}
        <div className="flex flex-col items-center gap-1">
          <Bed className="w-6 h-6 text-[#00a0e3]" />
          <span className="text-xs text-gray-600">
            {property.rooms ? `${property.rooms} חד'` : "-"}
          </span>
        </div>
      </div>
      
      {/* Bottom Bar - Button & Price */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* View Button */}
        <Button 
          onClick={handleViewClick}
          className="bg-[#00a0e3] hover:bg-[#0090cc] text-white font-medium px-6 py-2 h-auto rounded-md"
        >
          לצפייה
        </Button>
        
        {/* Price */}
        <div className="text-left">
          <span className="text-[#00a0e3] font-bold text-xl">
            {property.price ? `₪ ${formatPrice(property.price)}` : "לא צוין"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CatalogPropertyCard;
