import { Building2, Users, TrendingUp, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { mockProperties, mockBuyers, formatPrice } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const activeProperties = mockProperties.filter(p => p.status === "פעיל").length;
  const hotBuyers = mockBuyers.filter(b => b.status === "חם").length;
  const totalValue = mockProperties.reduce((sum, p) => sum + p.price, 0);

  const recentProperties = mockProperties.slice(0, 4);
  const recentBuyers = mockBuyers.slice(0, 4);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "פעיל": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "נמכר": "bg-blue-100 text-blue-700 border-blue-200",
      "מושכר": "bg-purple-100 text-purple-700 border-purple-200",
      "בהמתנה": "bg-amber-100 text-amber-700 border-amber-200",
      "חם": "bg-red-100 text-red-700 border-red-200",
      "קר": "bg-slate-100 text-slate-700 border-slate-200",
      "סגור": "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

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
            trend={{ value: 12, isPositive: true }}
            variant="gold"
          />
          <StatCard
            title="קונים חמים"
            value={hotBuyers}
            icon={Users}
            trend={{ value: 8, isPositive: true }}
            variant="navy"
          />
          <StatCard
            title="סה״כ שווי נכסים"
            value={formatPrice(totalValue)}
            icon={TrendingUp}
          />
          <StatCard
            title="עסקאות החודש"
            value="3"
            icon={Calendar}
            trend={{ value: 25, isPositive: true }}
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
                {recentProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{property.address}</p>
                      <p className="text-sm text-muted-foreground">{property.city} • {property.rooms} חדרים</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getStatusColor(property.status)}>
                        {property.status}
                      </Badge>
                      <span className="font-semibold text-primary">{formatPrice(property.price)}</span>
                    </div>
                  </div>
                ))}
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
                {recentBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-semibold text-primary">
                          {buyer.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{buyer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(buyer.budget.min)} - {formatPrice(buyer.budget.max)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(buyer.status)}>
                      {buyer.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
