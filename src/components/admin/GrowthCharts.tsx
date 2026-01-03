import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Eye } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { he } from "date-fns/locale";

interface DayData {
  date: string;
  displayDate: string;
  count: number;
}

interface GrowthChartsProps {
  selectedAgentId?: string;
}

export const GrowthCharts = ({ selectedAgentId }: GrowthChartsProps) => {
  const [buyersData, setBuyersData] = useState<DayData[]>([]);
  const [viewsData, setViewsData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrowthData();
  }, [selectedAgentId]);

  const fetchGrowthData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      // Generate all dates in range
      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      const dateMap = new Map<string, number>();
      allDates.forEach((date) => {
        dateMap.set(format(date, "yyyy-MM-dd"), 0);
      });

      // Fetch buyers created in last 30 days
      let buyersQuery = supabase
        .from("buyers")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // If filtering by agent, get only their buyers
      if (selectedAgentId && selectedAgentId !== "all") {
        const { data: buyerIds } = await supabase
          .from("buyer_agents")
          .select("buyer_id")
          .eq("agent_id", selectedAgentId);

        if (buyerIds && buyerIds.length > 0) {
          const ids = buyerIds.map((b) => b.buyer_id);
          buyersQuery = buyersQuery.in("id", ids);
        } else {
          // No buyers for this agent
          const emptyData = allDates.map((date) => ({
            date: format(date, "yyyy-MM-dd"),
            displayDate: format(date, "dd/MM", { locale: he }),
            count: 0,
          }));
          setBuyersData(emptyData);
          setViewsData(emptyData);
          setLoading(false);
          return;
        }
      }

      const { data: buyers } = await buyersQuery;

      // Count buyers per day
      const buyerCounts = new Map(dateMap);
      buyers?.forEach((buyer) => {
        const date = format(new Date(buyer.created_at), "yyyy-MM-dd");
        buyerCounts.set(date, (buyerCounts.get(date) || 0) + 1);
      });

      const buyersChartData = allDates.map((date) => ({
        date: format(date, "yyyy-MM-dd"),
        displayDate: format(date, "dd/MM", { locale: he }),
        count: buyerCounts.get(format(date, "yyyy-MM-dd")) || 0,
      }));

      setBuyersData(buyersChartData);

      // Fetch property views in last 30 days
      let viewsQuery = supabase
        .from("property_views")
        .select("viewed_at, client_id")
        .gte("viewed_at", startDate.toISOString())
        .lte("viewed_at", endDate.toISOString());

      const { data: views } = await viewsQuery;

      // If filtering by agent, filter views by their buyers
      let filteredViews = views || [];
      if (selectedAgentId && selectedAgentId !== "all") {
        const { data: buyerIds } = await supabase
          .from("buyer_agents")
          .select("buyer_id")
          .eq("agent_id", selectedAgentId);

        if (buyerIds && buyerIds.length > 0) {
          const ids = new Set(buyerIds.map((b) => b.buyer_id));
          filteredViews = (views || []).filter((v) => ids.has(v.client_id));
        } else {
          filteredViews = [];
        }
      }

      // Count views per day
      const viewCounts = new Map(dateMap);
      filteredViews.forEach((view) => {
        const date = format(new Date(view.viewed_at), "yyyy-MM-dd");
        viewCounts.set(date, (viewCounts.get(date) || 0) + 1);
      });

      const viewsChartData = allDates.map((date) => ({
        date: format(date, "yyyy-MM-dd"),
        displayDate: format(date, "dd/MM", { locale: he }),
        count: viewCounts.get(format(date, "yyyy-MM-dd")) || 0,
      }));

      setViewsData(viewsChartData);
    } catch (error) {
      console.error("Error fetching growth data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalBuyers = buyersData.reduce((sum, d) => sum + d.count, 0);
  const totalViews = viewsData.reduce((sum, d) => sum + d.count, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Buyers Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              צמיחת קונים חדשים
            </div>
            <span className="text-2xl font-bold text-primary">{totalBuyers}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">30 ימים אחרונים</p>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buyersData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickCount={7}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    direction: "rtl"
                  }}
                  labelFormatter={(label) => `תאריך: ${label}`}
                  formatter={(value) => [`${value} קונים`, ""]}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Property Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              צפיות בנכסים
            </div>
            <span className="text-2xl font-bold text-blue-500">{totalViews}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">30 ימים אחרונים</p>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickCount={7}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    direction: "rtl"
                  }}
                  labelFormatter={(label) => `תאריך: ${label}`}
                  formatter={(value) => [`${value} צפיות`, ""]}
                />
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorViews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
