import { Building2, Users, TrendingUp, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { useProperties } from "@/hooks/useProperties";
import { useBuyers } from "@/hooks/useBuyers";
import { formatPrice } from "@/lib/formatPrice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: buyers = [], isLoading: buyersLoading } = useBuyers();

  const isLoading = propertiesLoading || buyersLoading;

  const activeProperties = properties.filter((p) => p.status === "available").length;
  const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);

  const recentProperties = properties.slice(0, 4);
  const recentBuyers = buyers.slice(0, 4);

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
          <p className="mt-2 text-muted-foreground">ברוכים הבאים ל-EXTRAMILE - סקירה כללית</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="נכסים פעילים"
            value={activeProperties}
            icon={Building2}
            variant="gold"
          />
          <StatCard
            title="סה״כ קונים"
            value={buyers.length}
            icon={Users}
            variant="navy"
          />
          <StatCard
            title="סה״כ שווי נכסים"
            value={formatPrice(totalValue)}
            icon={TrendingUp}
          />
          <StatCard
            title="סה״כ נכסים"
            value={properties.length}
            icon={Building2}
          />
        </div>

        {/* Recent Activity Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Properties */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">נכסים אחרונים</CardTitle>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProperties.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">אין נכסים להצגה</p>
                ) : (
                  recentProperties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{property.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.city} • {property.rooms || 0} חדרים
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getStatusColor(property.status)}>
                          {getStatusLabel(property.status)}
                        </Badge>
                        <span className="font-semibold text-primary">
                          {formatPrice(property.price)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Buyers */}
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">קונים אחרונים</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBuyers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">אין קונים להצגה</p>
                ) : (
                  recentBuyers.map((buyer) => (
                    <div
                      key={buyer.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
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
                          <p className="text-sm text-muted-foreground">
                            {buyer.budget_min || buyer.budget_max
                              ? `${formatPrice(buyer.budget_min)} - ${formatPrice(buyer.budget_max)}`
                              : "תקציב לא צוין"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
