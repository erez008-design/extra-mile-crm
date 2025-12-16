import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Users, ExternalLink, Filter, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { safeDateDisplay } from "@/lib/safeDate";

interface BuyerWithStats {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  agent_id: string | null;
  agent_name: string | null;
  total_properties: number;
  interested_count: number;
}

interface Agent {
  id: string;
  full_name: string | null;
  email: string;
}

const ITEMS_PER_PAGE = 50;

export const AdminAllBuyers = () => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<BuyerWithStats[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBuyers, setTotalBuyers] = useState(0);
  
  // Auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize auth and wait for session
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) return;
        if (!isMounted) return;
        
        if (session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch (error) {
        // Auth error - silently fail
      } finally {
        if (isMounted) {
          setTimeout(() => {
            setAuthChecking(false);
          }, 0);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
        setTimeout(() => {
          setAuthChecking(false);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setBuyers([]);
        setAuthChecking(false);
      }
    });

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch agents once auth is ready
  useEffect(() => {
    if (!authChecking && userId) {
      fetchAgents();
    }
  }, [authChecking, userId]);

  // Fetch buyers when auth is ready AND when filter/page changes
  useEffect(() => {
    if (!authChecking && userId) {
      fetchBuyers();
    }
  }, [authChecking, userId, selectedAgentFilter, currentPage]);

  const fetchAgents = async () => {
    const { data: agentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "agent");

    if (agentRoles && agentRoles.length > 0) {
      const agentIds = agentRoles.map((r) => r.user_id);

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", agentIds);

      if (data) {
        setAgents(data);
      }
    }
  };

  const fetchBuyers = async () => {
    if (!userId) return;
    
    setLoading(true);

    try {
      
      // Get all buyers with their agent relationships
      let query = supabase
        .from("buyers")
        .select(`
          id,
          full_name,
          phone,
          created_at,
          buyer_agents (
            agent_id
          )
        `, { count: 'exact' })
        .order("created_at", { ascending: false });

      // Get total count for pagination
      const { count } = await supabase
        .from("buyers")
        .select("*", { count: "exact", head: true });

      setTotalBuyers(count || 0);

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: buyersData, error } = await query;

      if (error) {
        toast.error("שגיאה בטעינת קונים");
        setLoading(false);
        return;
      }

      if (buyersData) {
        // Get all agent profiles
        const allAgentIds = [...new Set(
          buyersData.flatMap((b: any) => 
            b.buyer_agents?.map((ba: any) => ba.agent_id) || []
          )
        )];

        let agentProfiles: Record<string, string> = {};
        if (allAgentIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", allAgentIds);

          if (profiles) {
            agentProfiles = profiles.reduce((acc: any, p) => {
              acc[p.id] = p.full_name || p.email;
              return acc;
            }, {});
          }
        }

        // Get buyer_properties counts for all buyers
        const buyerIds = buyersData.map((b: any) => b.id);
        
        const { data: propertyCounts } = await supabase
          .from("buyer_properties")
          .select("buyer_id, status")
          .in("buyer_id", buyerIds);

        // Calculate stats per buyer
        const statsMap: Record<string, { total: number; interested: number }> = {};
        buyerIds.forEach((id: string) => {
          statsMap[id] = { total: 0, interested: 0 };
        });

        if (propertyCounts) {
          propertyCounts.forEach((bp: any) => {
            if (statsMap[bp.buyer_id]) {
              statsMap[bp.buyer_id].total++;
              if (bp.status === "interested" || bp.status === "seen_and_liked") {
                statsMap[bp.buyer_id].interested++;
              }
            }
          });
        }

        // Build final buyer list
        let enrichedBuyers: BuyerWithStats[] = buyersData.map((buyer: any) => {
          const agentId = buyer.buyer_agents?.[0]?.agent_id || null;
          return {
            id: buyer.id,
            full_name: buyer.full_name,
            phone: buyer.phone,
            created_at: buyer.created_at,
            agent_id: agentId,
            agent_name: agentId ? agentProfiles[agentId] || "לא ידוע" : "ללא סוכן",
            total_properties: statsMap[buyer.id]?.total || 0,
            interested_count: statsMap[buyer.id]?.interested || 0,
          };
        });

        // Filter by agent if selected
        if (selectedAgentFilter !== "all") {
          enrichedBuyers = enrichedBuyers.filter(
            (b) => b.agent_id === selectedAgentFilter
          );
        }

        setBuyers(enrichedBuyers);
      }
    } catch (error) {
      toast.error("שגיאה בטעינת קונים");
    } finally {
      setLoading(false);
    }
  };

  const getActivityStatus = (buyer: BuyerWithStats) => {
    if (buyer.interested_count > 0) {
      return { label: "פעיל", variant: "default" as const };
    }
    if (buyer.total_properties > 0) {
      return { label: "ממתין", variant: "secondary" as const };
    }
    return { label: "חדש", variant: "outline" as const };
  };

  const totalPages = Math.ceil(totalBuyers / ITEMS_PER_PAGE);

  // Show loading state while checking auth OR waiting for userId
  if (authChecking || !userId) {
    return (
      <div className="flex items-center justify-center py-12" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">סינון לפי סוכן</CardTitle>
            </div>
            <Select
              value={selectedAgentFilter}
              onValueChange={(value) => {
                setSelectedAgentFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="בחר סוכן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוכנים</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name || agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Buyers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>כל הקונים ({totalBuyers})</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : buyers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>לא נמצאו קונים</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם הלקוח</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">סוכן מטפל</TableHead>
                      <TableHead className="text-center">נכסים שהוצעו</TableHead>
                      <TableHead className="text-center">נכסים שאהב</TableHead>
                      <TableHead className="text-right">תאריך יצירה</TableHead>
                      <TableHead className="text-center">סטטוס</TableHead>
                      <TableHead className="text-center">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyers.map((buyer) => {
                      const status = getActivityStatus(buyer);
                      return (
                        <TableRow key={buyer.id}>
                          <TableCell className="font-medium">
                            {buyer.full_name}
                          </TableCell>
                          <TableCell dir="ltr" className="text-right">
                            {buyer.phone}
                          </TableCell>
                          <TableCell>{buyer.agent_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {buyer.total_properties}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">
                              {buyer.interested_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {safeDateDisplay(buyer.created_at, (d) => format(d, "dd/MM/yyyy", { locale: he }))}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/buyer/${buyer.id}`)}
                            >
                              <ExternalLink className="w-4 h-4 ml-1" />
                              צפה
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {buyers.map((buyer) => {
                  const status = getActivityStatus(buyer);
                  return (
                    <div
                      key={buyer.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{buyer.full_name}</div>
                          <div className="text-sm text-muted-foreground" dir="ltr">
                            {buyer.phone}
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        סוכן: {buyer.agent_name}
                      </div>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span>נכסים: {buyer.total_properties}</span>
                        <span>אהב: {buyer.interested_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {safeDateDisplay(buyer.created_at, (d) => format(d, "dd/MM/yyyy", { locale: he }))}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/buyer/${buyer.id}`)}
                        >
                          <ExternalLink className="w-4 h-4 ml-1" />
                          צפה
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAllBuyers;
