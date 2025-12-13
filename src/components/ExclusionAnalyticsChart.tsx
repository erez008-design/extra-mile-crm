import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart3, CalendarIcon, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subDays, startOfQuarter } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExclusionReason {
  reason: string;
  count: number;
}

interface ExclusionAnalyticsChartProps {
  data: ExclusionReason[];
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
  title?: string;
}

const CHART_COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

type DateRangePreset = "alltime" | "7days" | "30days" | "quarter" | "custom";

export const ExclusionAnalyticsChart = ({ data, onDateRangeChange, title }: ExclusionAnalyticsChartProps) => {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("30days");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    
    if (!onDateRangeChange) return;
    
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = now;
    
    switch (preset) {
      case "alltime":
        startDate = null;
        endDate = null;
        break;
      case "7days":
        startDate = subDays(now, 7);
        break;
      case "30days":
        startDate = subDays(now, 30);
        break;
      case "quarter":
        startDate = startOfQuarter(now);
        break;
      case "custom":
        // Don't call the callback yet, wait for user to select dates
        return;
    }
    
    onDateRangeChange(startDate, endDate);
  };

  const handleCustomDateApply = () => {
    if (onDateRangeChange && customStartDate) {
      onDateRangeChange(customStartDate, customEndDate || new Date());
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) {
      toast.error("אין נתונים לייצוא");
      return;
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    const headers = ["סיבה", "כמות", "אחוז"];
    const csvRows = [
      headers.join(","),
      ...data.map(item => [
        `"${item.reason.replace(/"/g, '""')}"`,
        item.count,
        `${total > 0 ? Math.round((item.count / total) * 100) : 0}%`
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exclusion_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("הקובץ יוצא בהצלחה");
  };

  const chartTitle = title || "סיבות נפוצות לאי התאמה (Hard Filter)";

  const renderDateRangeSelector = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={dateRangePreset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="בחר טווח זמן" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alltime">כל הזמנים</SelectItem>
          <SelectItem value="7days">7 ימים אחרונים</SelectItem>
          <SelectItem value="30days">30 ימים אחרונים</SelectItem>
          <SelectItem value="quarter">רבעון</SelectItem>
          <SelectItem value="custom">טווח מותאם אישית</SelectItem>
        </SelectContent>
      </Select>
      
      {dateRangePreset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-right font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: he }) : "מתאריך"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">עד</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-right font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: he }) : "עד תאריך"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button size="sm" onClick={handleCustomDateApply} disabled={!customStartDate}>
            החל
          </Button>
        </div>
      )}
    </div>
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base">{chartTitle}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {onDateRangeChange && renderDateRangeSelector()}
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled>
                <Download className="w-4 h-4 ml-2" />
                ייצוא CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">אין נתונים לתצוגה בטווח הזמן הנבחר</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const chartData = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{item.reason}</p>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{item.count}</span> נכסים ({item.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">{chartTitle}</CardTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {onDateRangeChange && renderDateRangeSelector()}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          סה״כ {total} נכסים נפסלו
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="reason" 
                width={180}
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                barSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with percentages */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          {chartData.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm">{item.reason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.count}</span>
                <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};