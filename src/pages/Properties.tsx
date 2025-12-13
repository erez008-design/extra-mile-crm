import { useState } from "react";
import { Search, Filter, MoreVertical, Building2, MapPin, Maximize, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProperties, useNeighborhoods } from "@/hooks/useProperties";
import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Properties() {
  const { data: properties = [], isLoading, error } = useProperties();
  const { data: neighborhoods = [] } = useNeighborhoods();
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");

  const cities = [...new Set(neighborhoods.map((n) => n.city_name))];

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.address.includes(searchQuery) ||
      property.city.includes(searchQuery) ||
      (property.neighborhood?.includes(searchQuery) ?? false);
    const matchesCity = cityFilter === "all" || property.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      available: "bg-emerald-100 text-emerald-700 border-emerald-200",
      sold: "bg-blue-100 text-blue-700 border-blue-200",
      rented: "bg-purple-100 text-purple-700 border-purple-200",
      pending: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[status || ""] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      available: "פעיל",
      sold: "נמכר",
      rented: "מושכר",
      pending: "בהמתנה",
    };
    return labels[status || ""] || status || "לא ידוע";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <p className="text-destructive">שגיאה בטעינת הנכסים</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground">נכסים</h1>
            <p className="mt-1 text-muted-foreground">
              {properties.length} נכסים במערכת
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי כתובת, עיר או שכונה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="סינון לפי עיר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הערים</SelectItem>
              {cities.map((city: string) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Properties Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property, index) => {
            const primaryImage = property.images.find((img) => img.is_primary) || property.images[0];
            
            return (
              <Card
                key={property.id}
                className="group overflow-hidden transition-all duration-300 hover:shadow-lg animate-scale-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5">
                  {primaryImage ? (
                    <img
                      src={primaryImage.url}
                      alt={property.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-primary/20" />
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={`absolute top-3 right-3 ${getStatusColor(property.status)}`}
                  >
                    {getStatusLabel(property.status)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 left-2 h-8 w-8 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>עריכה</DropdownMenuItem>
                      <DropdownMenuItem>צפייה בפרטים</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-foreground">{property.address}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {property.city}
                      {property.neighborhood && ` • ${property.neighborhood}`}
                    </p>
                  </div>
                  <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    {property.rooms && <span>{property.rooms} חדרים</span>}
                    {property.size_sqm && (
                      <span className="flex items-center gap-1">
                        <Maximize className="h-3 w-3" />
                        {property.size_sqm} מ״ר
                      </span>
                    )}
                    {property.floor !== null && <span>קומה {property.floor}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(property.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProperties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">לא נמצאו נכסים</h3>
            <p className="mt-2 text-muted-foreground">נסה לחפש במילות מפתח אחרות</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
