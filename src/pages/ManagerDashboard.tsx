import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useManagerNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Building2, 
  CheckCircle2,
  Eye,
  Home,
  Castle,
  Warehouse
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { GlobalActivityFeed } from "@/components/activity/GlobalActivityFeed";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { isManager, isLoading: roleLoading } = useUserRole();
  const { notifications, isLoading, unreadCount, markAsReadByManager } = useManagerNotifications();
  
  // Analytics state
  const [propertyTypeData, setPropertyTypeData] = useState<Array<{name: string; value: number; color: string}>>([]);
  const [topViewedProperties, setTopViewedProperties] = useState<Array<{id: string; address: string; city: string; views: number}>>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isManager) {
      navigate("/");
    }
  }, [isManager, roleLoading, navigate]);

  // Fetch analytics data
  useEffect(() => {
    if (isManager) {
      fetchAnalytics();
    }
  }, [isManager]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      // Fetch property type distribution
      const { data: properties } = await supabase
        .from("properties")
        .select("property_type");
      
      if (properties) {
        const typeCounts: Record<string, number> = {};
        properties.forEach(p => {
          const type = p.property_type || "apartment";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const typeLabels: Record<string, { label: string; color: string }> = {
          apartment: { label: "דירה", color: "#3b82f6" },
          private_house: { label: "בית פרטי", color: "#22c55e" },
          penthouse: { label: "פנטהאוז", color: "#a855f7" },
          semi_detached: { label: "דו-משפחתי", color: "#f97316" },
        };
        
        const chartData = Object.entries(typeCounts).map(([type, count]) => ({
          name: typeLabels[type]?.label || type,
          value: count,
          color: typeLabels[type]?.color || "#6b7280",
        }));
        
        setPropertyTypeData(chartData);
      }

      // Fetch top viewed properties
      const { data: views } = await supabase
        .from("property_views")
        .select("property_id")
        .order("viewed_at", { ascending: false });
      
      if (views) {
        // Count views per property
        const viewCounts: Record<string, number> = {};
        views.forEach(v => {
          viewCounts[v.property_id] = (viewCounts[v.property_id] || 0) + 1;
        });
        
        // Get top 5
        const topPropertyIds = Object.entries(viewCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id);
        
        if (topPropertyIds.length > 0) {
          const { data: topProps } = await supabase
            .from("properties")
            .select("id, address, city")
            .in("id", topPropertyIds);
          
          if (topProps) {
            const topViewed = topProps.map(p => ({
              ...p,
              views: viewCounts[p.id] || 0
            })).sort((a, b) => b.views - a.views);
            
            setTopViewedProperties(topViewed);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Skeleton className="h-8 w-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isManager) {
    return null;
  }

  const highScoreMatches = notifications.filter(n => n.match_score >= 80);
  const todayMatches = notifications.filter(n => {
    const date = new Date(n.created_at);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-emerald-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">לוח בקרה - מנהל</h1>
          <p className="text-muted-foreground">מעקב אחר התאמות AI בזמן אמת</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                  <p className="text-sm text-muted-foreground">סה״כ התאמות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{highScoreMatches.length}</p>
                  <p className="text-sm text-muted-foreground">התאמות גבוהות (80%+)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayMatches.length}</p>
                  <p className="text-sm text-muted-foreground">התאמות היום</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Eye className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">לא נקראו</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                התפלגות סוגי נכסים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : propertyTypeData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">אין נתונים</div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={propertyTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {propertyTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Viewed Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                נכסים הכי נצפים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : topViewedProperties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">אין נתונים</div>
              ) : (
                <div className="space-y-3">
                  {topViewedProperties.map((prop, idx) => (
                    <div 
                      key={prop.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/property/${prop.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">{idx + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{prop.address}</p>
                          <p className="text-xs text-muted-foreground">{prop.city}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{prop.views} צפיות</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Two column layout for feeds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Matches Feed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                התאמות AI אחרונות
              </CardTitle>
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                חי
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין התאמות עדיין</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {notifications.slice(0, 20).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                          !notification.is_read_by_manager 
                            ? "bg-primary/5 border-primary/20" 
                            : "bg-card"
                        }`}
                        onClick={() => {
                          markAsReadByManager.mutate(notification.id);
                          navigate(`/property/${notification.property_id}`);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div 
                              className={`w-10 h-10 rounded-full ${getScoreColor(notification.match_score)} flex items-center justify-center text-white font-bold text-xs`}
                            >
                              {notification.match_score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">
                                  {notification.buyer?.full_name}
                                </p>
                                {notification.is_read_by_manager && (
                                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {notification.property?.address}, {notification.property?.city}
                              </p>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: he,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Global Activity Feed */}
          <GlobalActivityFeed limit={50} />
        </div>
      </div>
    </DashboardLayout>
  );
}
