import { useState } from "react";
import { Search, Filter, MoreVertical, Phone, Users, Loader2, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBuyers, BuyerData } from "@/hooks/useBuyers";
import { formatPrice } from "@/lib/formatPrice";
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
import { SmartMatchingModal } from "@/components/buyers/SmartMatchingModal";

export default function Buyers() {
  const { data: buyers = [], isLoading, error } = useBuyers();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);

  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.full_name.includes(searchQuery) ||
      (buyer.phone?.includes(searchQuery) ?? false)
  );

  const handleSmartMatch = (buyer: BuyerData) => {
    setSelectedBuyer(buyer);
    setMatchingModalOpen(true);
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
          <p className="text-destructive">שגיאה בטעינת הקונים</p>
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
            <h1 className="text-3xl font-bold text-foreground">קונים</h1>
            <p className="mt-1 text-muted-foreground">
              {buyers.length} קונים במערכת
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם או טלפון..."
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
                <TableHead className="text-right font-semibold">טלפון</TableHead>
                <TableHead className="text-right font-semibold">תקציב</TableHead>
                <TableHead className="text-right font-semibold">אזורים</TableHead>
                <TableHead className="text-right font-semibold">חדרים</TableHead>
                <TableHead className="text-right font-semibold">התאמה חכמה</TableHead>
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
                          {buyer.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{buyer.full_name}</p>
                        {buyer.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {buyer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {buyer.phone && (
                      <p className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {buyer.phone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {buyer.budget_min || buyer.budget_max
                        ? `${formatPrice(buyer.budget_min)} - ${formatPrice(buyer.budget_max)}`
                        : "לא צוין"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(buyer.target_cities || []).slice(0, 2).map((city) => (
                        <Badge key={city} variant="secondary" className="text-xs">
                          {city}
                        </Badge>
                      ))}
                      {(buyer.target_cities?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(buyer.target_cities?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {buyer.min_rooms ? `${buyer.min_rooms}+` : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-accent hover:text-accent hover:bg-accent/10 border-accent/30"
                      onClick={() => handleSmartMatch(buyer)}
                    >
                      <Sparkles className="h-4 w-4" />
                      התאמה חכמה
                    </Button>
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
                        <DropdownMenuItem onClick={() => handleSmartMatch(buyer)}>
                          התאמת נכסים
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

      {/* Smart Matching Modal */}
      <SmartMatchingModal
        buyer={selectedBuyer}
        open={matchingModalOpen}
        onOpenChange={setMatchingModalOpen}
      />
    </DashboardLayout>
  );
}
