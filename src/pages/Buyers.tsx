import { useState, useMemo } from "react";
import { Search, Filter, MoreVertical, Phone, Users, Sparkles, Trash2, Link, MessageCircle, CalendarClock, Camera, FileText, ArrowUpDown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBuyers, BuyerData } from "@/hooks/useBuyers";
import { useBuyerActivityStats } from "@/hooks/useBuyerActivityStats";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SmartMatchingModal } from "@/components/buyers/SmartMatchingModal";
import { BuyerDetailsDrawer } from "@/components/buyers/BuyerDetailsDrawer";
import { toast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortOption = "name" | "created" | "activity" | "followup";

export default function Buyers() {
  const { data: buyers = [], isLoading, error } = useBuyers();
  const deleteBuyerMutation = useDeleteBuyer();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerData | null>(null);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState<BuyerData | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("created");

  // Fetch activity stats for all buyers
  const buyerIds = useMemo(() => buyers.map(b => b.id), [buyers]);
  const { data: activityStats = {} } = useBuyerActivityStats(buyerIds);

  // Filter and sort buyers
  const filteredAndSortedBuyers = useMemo(() => {
    let filtered = buyers.filter(
      (buyer) => buyer.full_name.includes(searchQuery) || (buyer.phone?.includes(searchQuery) ?? false),
    );

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "activity": {
          const aActivity = activityStats[a.id]?.last_activity_at || "";
          const bActivity = activityStats[b.id]?.last_activity_at || "";
          return bActivity.localeCompare(aActivity); // Most recent first
        }
        case "followup": {
          const aDate = (a as any).follow_up_date || "";
          const bDate = (b as any).follow_up_date || "";
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate.localeCompare(bDate);
        }
        case "name":
          return a.full_name.localeCompare(b.full_name, "he");
        case "created":
        default:
          return (b.created_at || "").localeCompare(a.created_at || "");
      }
    });
  }, [buyers, searchQuery, sortBy, activityStats]);

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
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px] gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="מיון לפי" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">תאריך הוספה</SelectItem>
              <SelectItem value="activity">פעילות אחרונה</SelectItem>
              <SelectItem value="followup">תאריך פולואפ</SelectItem>
              <SelectItem value="name">שם</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            סינון
          </Button>
        </div>

        {filteredAndSortedBuyers.length === 0 ? (
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
                <TableHead className="text-right font-semibold">פעילות</TableHead>
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
              {filteredAndSortedBuyers.map((buyer) => {
                const stats = activityStats[buyer.id];
                return (
                <TableRow
                  key={buyer.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(buyer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {buyer.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        {stats?.has_recent_activity && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{buyer.full_name}</p>
                        {stats?.has_recent_activity && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0">
                            חדש
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex items-center gap-2">
                        {stats?.uploads_count > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-full">
                                <Camera className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">{stats.uploads_count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stats.uploads_count} קבצים הועלו</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {stats?.has_notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full">
                                <FileText className="h-3.5 w-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>יש הערות אישיות</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!stats?.uploads_count && !stats?.has_notes && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TooltipProvider>
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
              );
              })}
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
