import { useState } from "react";
import { Search, Filter, MoreVertical, Phone, Users, Sparkles, Trash2, Link, MessageCircle, CalendarClock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBuyers, BuyerData } from "@/hooks/useBuyers";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteBuyer } from "@/hooks/useOfferedProperties";
import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SmartMatchingModal } from "@/components/buyers/SmartMatchingModal";
import { BuyerDetailsDrawer } from "@/components/buyers/BuyerDetailsDrawer";
import { toast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";

export default function Buyers() {
  const { data: buyers = [], isLoading, error } = useBuyers();
  const deleteBuyerMutation = useDeleteBuyer();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState<BuyerData | null>(null);

  const filteredBuyers = buyers.filter(
    (buyer) => buyer.full_name.includes(searchQuery) || (buyer.phone?.includes(searchQuery) ?? false),
  );

  // פונקציה חדשה להעתקת קישור שמותאם לאייפון
  const handleCopyLink = async (buyer: BuyerData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "הקישור הועתק",
        description: "הקישור מוכן לשליחה ועובד גם באייפון",
      });
    } catch (err) {
      toast({ title: "שגיאה בהעתקת הקישור", variant: "destructive" });
    }
  };

  // פונקציה לשליחת וואטסאפ עם רישום פעילות
  const handleSendWhatsApp = async (buyer: BuyerData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const baseUrl = "https://extramile-rtl-dash.lovable.app";
    const shareUrl = `${baseUrl}/buyer/${buyer.id}`;
    
    // ניקוי מספר הטלפון והוספת קידומת ישראל
    let phone = buyer.phone?.replace(/\D/g, "") || "";
    if (phone.startsWith("0")) {
      phone = "972" + phone.slice(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }
    
    const message = `היי ${buyer.full_name}, הכנתי עבורך רשימת נכסים חדשים שמתאימים לדרישות שלך. אפשר לראות את כל הפרטים והתמונות כאן: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // Log activity to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_logs").insert({
        buyer_id: buyer.id,
        agent_id: user?.id || null,
        action_type: "whatsapp_sent" as any,
        description: "נשלחה הודעת WhatsApp עם קישור לנכסים",
        metadata: { phone, share_url: shareUrl }
      });
    } catch (error) {
      console.error("Failed to log WhatsApp activity:", error);
    }
    
    window.open(whatsappUrl, "_blank");
  };

  const handleSmartMatch = (buyer: BuyerData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedBuyer(buyer);
    setMatchingModalOpen(true);
  };

  const handleRowClick = (buyer: BuyerData) => {
    setSelectedBuyer(buyer);
    setDetailsDrawerOpen(true);
  };

  const handleDeleteClick = (buyer: BuyerData, e: React.MouseEvent) => {
    e.stopPropagation();
    setBuyerToDelete(buyer);
  };

  const confirmDelete = async () => {
    if (!buyerToDelete) return;
    try {
      await deleteBuyerMutation.mutateAsync(buyerToDelete.id);
      toast({ title: "הקונה נמחק בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה במחיקת הקונה", variant: "destructive" });
    } finally {
      setBuyerToDelete(null);
    }
  };

  const getFollowUpBadge = (followUpDate: string | null) => {
    if (!followUpDate) return null;
    const date = new Date(followUpDate);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">עבר</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-orange-500 text-white text-xs">היום</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-blue-500 text-white text-xs">מחר</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{format(date, "d/M", { locale: he })}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">קונים</h1>
              <p className="mt-1 text-muted-foreground">טוען...</p>
            </div>
          </div>
          <TableSkeleton columns={7} rows={8} />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground">קונים</h1>
            <p className="mt-1 text-muted-foreground">{buyers.length} קונים במערכת</p>
          </div>
        </div>

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

        {filteredBuyers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="אין קונים להצגה"
            description={searchQuery ? "לא נמצאו קונים התואמים לחיפוש" : "עדיין לא הוספת קונים למערכת"}
          />
        ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right font-semibold">שם</TableHead>
                <TableHead className="text-right font-semibold">טלפון</TableHead>
                <TableHead className="text-right font-semibold">תקציב</TableHead>
                <TableHead className="text-right font-semibold">אזורים</TableHead>
                <TableHead className="text-right font-semibold">חדרים</TableHead>
                <TableHead className="text-right font-semibold">פולואפ</TableHead>
                <TableHead className="text-right font-semibold">התאמה חכמה</TableHead>
                <TableHead className="text-right font-semibold w-12">מחיקה</TableHead>
                <TableHead className="text-right font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuyers.map((buyer) => (
                <TableRow
                  key={buyer.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(buyer)}
                >
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
                    </div>
                  </TableCell>
                  <TableCell>{buyer.min_rooms ? `${buyer.min_rooms}+` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(buyer as any).follow_up_date && (
                        <>
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          {getFollowUpBadge((buyer as any).follow_up_date)}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-accent hover:text-accent hover:bg-accent/10 border-accent/30"
                      onClick={(e) => handleSmartMatch(buyer, e)}
                    >
                      <Sparkles className="h-4 w-4" />
                      התאמה חכמה
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(buyer, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={(e) => handleCopyLink(buyer, e)}>
                          <Link className="ml-2 h-4 w-4" />
                          העתק קישור לקונה
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleSendWhatsApp(buyer, e)} className="text-emerald-600">
                          <MessageCircle className="ml-2 h-4 w-4" />
                          שלח בוואטסאפ
                        </DropdownMenuItem>
                        <DropdownMenuItem>עריכה</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSmartMatch(buyer)}>התאמת נכסים</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </div>

      <SmartMatchingModal buyer={selectedBuyer} open={matchingModalOpen} onOpenChange={setMatchingModalOpen} />

      <BuyerDetailsDrawer buyer={selectedBuyer} open={detailsDrawerOpen} onOpenChange={setDetailsDrawerOpen} />

      <AlertDialog open={!!buyerToDelete} onOpenChange={(open) => !open && setBuyerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקונה "{buyerToDelete?.full_name}" לצמיתות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
