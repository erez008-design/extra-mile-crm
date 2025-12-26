import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useManagerNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Building2, 
  CheckCircle2,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { isManager, isLoading: roleLoading } = useUserRole();
  const { notifications, isLoading, unreadCount, markAsReadByManager } = useManagerNotifications();

  useEffect(() => {
    if (!roleLoading && !isManager) {
      navigate("/");
    }
  }, [isManager, roleLoading, navigate]);

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

        {/* Live Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              פיד התאמות AI בזמן אמת
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
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {notifications.map((notification) => (
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
                            className={`w-12 h-12 rounded-full ${getScoreColor(notification.match_score)} flex items-center justify-center text-white font-bold text-sm`}
                          >
                            {notification.match_score}%
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">
                                {notification.buyer?.full_name}
                              </p>
                              {notification.is_read_by_manager && (
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notification.property?.address}, {notification.property?.city}
                            </p>
                            {notification.match_reason && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.match_reason}
                              </p>
                            )}
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
      </div>
    </DashboardLayout>
  );
}
