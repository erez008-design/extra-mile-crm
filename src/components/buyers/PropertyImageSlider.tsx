import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyImageSliderProps {
  images: { url: string; is_primary: boolean }[];
  propertyAddress: string;
  onImageClick: () => void;
  onGalleryClick: () => void;
}

export function PropertyImageSlider({
  images,
  propertyAddress,
  onImageClick,
  onGalleryClick,
}: PropertyImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Sort images with primary first
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        // Swipe left -> next (for RTL this is actually going forward)
        goToPrev();
      } else {
        // Swipe right -> prev (for RTL this is actually going backward)
        goToNext();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (sortedImages.length === 0) return null;

  return (
    <div className="relative overflow-hidden">
      {/* Main Image */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={sortedImages[currentIndex]?.url}
          alt={`${propertyAddress} - ${currentIndex + 1}`}
          className="w-full h-48 object-cover cursor-pointer"
          onClick={onImageClick}
        />
      </div>

      {/* Navigation Arrows */}
      {sortedImages.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Gallery Icon */}
      {sortedImages.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGalleryClick();
          }}
          className="absolute top-3 left-3 z-10 bg-black/60 text-white p-2 rounded-lg hover:bg-black/80"
          aria-label="Open gallery"
        >
          <Images className="w-4 h-4" />
        </button>
      )}

      {/* Image Count Badge */}
      <Badge className="absolute bottom-2 right-2 z-10 bg-black/60 text-white">
        {sortedImages.length} תמונות
      </Badge>

      {/* Dot Indicators */}
      {sortedImages.length > 1 && sortedImages.length <= 10 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {sortedImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                currentIndex === idx ? "bg-white scale-125" : "bg-white/50"
              }`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
