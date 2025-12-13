import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Phone, Mail, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { mockBuyers, formatPrice, Buyer } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function Buyers() {
  const [buyers, setBuyers] = useState<Buyer[]>(mockBuyers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    name: "",
    phone: "",
    email: "",
    budgetMin: "",
    budgetMax: "",
    preferredAreas: "",
    preferredRooms: "",
    status: "פעיל" as Buyer["status"],
    notes: "",
  });

  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.name.includes(searchQuery) ||
      buyer.phone.includes(searchQuery) ||
      buyer.email.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "חם": "bg-red-100 text-red-700 border-red-200",
      "פעיל": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "קר": "bg-slate-100 text-slate-700 border-slate-200",
      "סגור": "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const handleAddBuyer = () => {
    if (!newBuyer.name || !newBuyer.phone) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    const buyer: Buyer = {
      id: String(Date.now()),
      name: newBuyer.name,
      phone: newBuyer.phone,
      email: newBuyer.email,
      budget: {
        min: Number(newBuyer.budgetMin) || 0,
        max: Number(newBuyer.budgetMax) || 0,
      },
      preferredAreas: newBuyer.preferredAreas.split(",").map((a) => a.trim()).filter(Boolean),
      preferredRooms: newBuyer.preferredRooms.split(",").map((r) => Number(r.trim())).filter(Boolean),
      status: newBuyer.status,
      notes: newBuyer.notes,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setBuyers([buyer, ...buyers]);
    setNewBuyer({
      name: "",
      phone: "",
      email: "",
      budgetMin: "",
      budgetMax: "",
      preferredAreas: "",
      preferredRooms: "",
      status: "פעיל",
      notes: "",
    });
    setIsAddDialogOpen(false);
    toast({
      title: "קונה נוסף בהצלחה",
      description: buyer.name,
    });
  };

  const handleDeleteBuyer = (id: string) => {
    setBuyers(buyers.filter((b) => b.id !== id));
    toast({
      title: "קונה נמחק",
      description: "הקונה הוסר מהמערכת",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground">קונים</h1>
            <p className="mt-1 text-muted-foreground">ניהול כל הקונים והלקוחות</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold" className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף קונה
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>הוסף קונה חדש</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">שם מלא</Label>
                  <Input
                    id="name"
                    value={newBuyer.name}
                    onChange={(e) =>
                      setNewBuyer({ ...newBuyer, name: e.target.value })
                    }
                    placeholder="שם פרטי ומשפחה"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={newBuyer.phone}
                      onChange={(e) =>
                        setNewBuyer({ ...newBuyer, phone: e.target.value })
                      }
                      placeholder="050-0000000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newBuyer.email}
                      onChange={(e) =>
                        setNewBuyer({ ...newBuyer, email: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="budgetMin">תקציב מינימום</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      value={newBuyer.budgetMin}
                      onChange={(e) =>
                        setNewBuyer({ ...newBuyer, budgetMin: e.target.value })
                      }
                      placeholder="₪"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budgetMax">תקציב מקסימום</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      value={newBuyer.budgetMax}
                      onChange={(e) =>
                        setNewBuyer({ ...newBuyer, budgetMax: e.target.value })
                      }
                      placeholder="₪"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="preferredAreas">אזורים מועדפים</Label>
                  <Input
                    id="preferredAreas"
                    value={newBuyer.preferredAreas}
                    onChange={(e) =>
                      setNewBuyer({ ...newBuyer, preferredAreas: e.target.value })
                    }
                    placeholder="תל אביב, רמת גן, הרצליה..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="preferredRooms">מספר חדרים</Label>
                    <Input
                      id="preferredRooms"
                      value={newBuyer.preferredRooms}
                      onChange={(e) =>
                        setNewBuyer({ ...newBuyer, preferredRooms: e.target.value })
                      }
                      placeholder="3, 4, 5..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>סטטוס</Label>
                    <Select
                      value={newBuyer.status}
                      onValueChange={(value: Buyer["status"]) =>
                        setNewBuyer({ ...newBuyer, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="חם">חם</SelectItem>
                        <SelectItem value="פעיל">פעיל</SelectItem>
                        <SelectItem value="קר">קר</SelectItem>
                        <SelectItem value="סגור">סגור</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea
                    id="notes"
                    value={newBuyer.notes}
                    onChange={(e) =>
                      setNewBuyer({ ...newBuyer, notes: e.target.value })
                    }
                    placeholder="הערות נוספות..."
                    rows={2}
                  />
                </div>
                <Button variant="gold" onClick={handleAddBuyer} className="mt-2">
                  הוסף קונה
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
              placeholder="חיפוש לפי שם, טלפון או אימייל..."
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

        {/* Buyers Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold">שם</TableHead>
                <TableHead className="text-right font-semibold">פרטי קשר</TableHead>
                <TableHead className="text-right font-semibold">תקציב</TableHead>
                <TableHead className="text-right font-semibold">אזורים</TableHead>
                <TableHead className="text-right font-semibold">סטטוס</TableHead>
                <TableHead className="text-right font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuyers.map((buyer) => (
                <TableRow key={buyer.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {buyer.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{buyer.name}</p>
                        {buyer.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {buyer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {buyer.phone}
                      </p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {buyer.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatPrice(buyer.budget.min)} - {formatPrice(buyer.budget.max)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {buyer.preferredAreas.slice(0, 2).map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {buyer.preferredAreas.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{buyer.preferredAreas.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(buyer.status)}>
                      {buyer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>עריכה</DropdownMenuItem>
                        <DropdownMenuItem>התאמת נכסים</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteBuyer(buyer.id)}
                        >
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredBuyers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">לא נמצאו קונים</h3>
              <p className="mt-2 text-muted-foreground">נסה לחפש במילות מפתח אחרות</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
