import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Building2, MapPin, Maximize } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { mockProperties, formatPrice, Property } from "@/data/mockData";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({
    address: "",
    city: "",
    price: "",
    rooms: "",
    area: "",
    type: "דירה" as Property["type"],
    status: "פעיל" as Property["status"],
  });

  const filteredProperties = properties.filter(
    (property) =>
      property.address.includes(searchQuery) ||
      property.city.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "פעיל": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "נמכר": "bg-blue-100 text-blue-700 border-blue-200",
      "מושכר": "bg-purple-100 text-purple-700 border-purple-200",
      "בהמתנה": "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getTypeIcon = (type: string) => {
    return <Building2 className="h-4 w-4" />;
  };

  const handleAddProperty = () => {
    if (!newProperty.address || !newProperty.city || !newProperty.price) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    const property: Property = {
      id: String(Date.now()),
      address: newProperty.address,
      city: newProperty.city,
      price: Number(newProperty.price),
      rooms: Number(newProperty.rooms) || 0,
      area: Number(newProperty.area) || 0,
      type: newProperty.type,
      status: newProperty.status,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setProperties([property, ...properties]);
    setNewProperty({
      address: "",
      city: "",
      price: "",
      rooms: "",
      area: "",
      type: "דירה",
      status: "פעיל",
    });
    setIsAddDialogOpen(false);
    toast({
      title: "נכס נוסף בהצלחה",
      description: `${property.address}, ${property.city}`,
    });
  };

  const handleDeleteProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
    toast({
      title: "נכס נמחק",
      description: "הנכס הוסר מהמערכת",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground">נכסים</h1>
            <p className="mt-1 text-muted-foreground">ניהול כל הנכסים במערכת</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold" className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף נכס
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>הוסף נכס חדש</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="address">כתובת</Label>
                  <Input
                    id="address"
                    value={newProperty.address}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, address: e.target.value })
                    }
                    placeholder="רחוב ומספר"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">עיר</Label>
                  <Input
                    id="city"
                    value={newProperty.city}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, city: e.target.value })
                    }
                    placeholder="שם העיר"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">מחיר (₪)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newProperty.price}
                      onChange={(e) =>
                        setNewProperty({ ...newProperty, price: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rooms">חדרים</Label>
                    <Input
                      id="rooms"
                      type="number"
                      value={newProperty.rooms}
                      onChange={(e) =>
                        setNewProperty({ ...newProperty, rooms: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="area">שטח (מ״ר)</Label>
                    <Input
                      id="area"
                      type="number"
                      value={newProperty.area}
                      onChange={(e) =>
                        setNewProperty({ ...newProperty, area: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>סוג נכס</Label>
                    <Select
                      value={newProperty.type}
                      onValueChange={(value: Property["type"]) =>
                        setNewProperty({ ...newProperty, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="דירה">דירה</SelectItem>
                        <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                        <SelectItem value="פנטהאוז">פנטהאוז</SelectItem>
                        <SelectItem value="דופלקס">דופלקס</SelectItem>
                        <SelectItem value="מגרש">מגרש</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="gold" onClick={handleAddProperty} className="mt-2">
                  הוסף נכס
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי כתובת או עיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            סינון
          </Button>
        </div>

        {/* Properties Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property, index) => (
            <Card
              key={property.id}
              className="group overflow-hidden transition-all duration-300 hover:shadow-lg animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-primary/20" />
                </div>
                <Badge
                  variant="outline"
                  className={`absolute top-3 right-3 ${getStatusColor(property.status)}`}
                >
                  {property.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 left-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>עריכה</DropdownMenuItem>
                    <DropdownMenuItem>שכפול</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      מחיקה
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground">{property.address}</h3>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {property.city}
                  </p>
                </div>
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getTypeIcon(property.type)}
                    {property.type}
                  </span>
                  <span>{property.rooms} חדרים</span>
                  <span className="flex items-center gap-1">
                    <Maximize className="h-3 w-3" />
                    {property.area} מ״ר
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
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
