import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Eye, 
  RefreshCw, 
  UserPlus, 
  Sparkles, 
  Activity,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useAllActivityLogs, 
  getActivityIcon, 
  getActivityLabel,
  ActivityLog 
} from "@/hooks/useActivityLogs";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  MessageSquare,
  FileText,
  Eye,
  RefreshCw,
  UserPlus,
  Sparkles,
  Activity,
};

function GlobalActivityItem({ activity }: { activity: ActivityLog }) {
  const { icon, color, bgColor } = getActivityIcon(activity.action_type);
  const IconComponent = iconMap[icon] || Activity;
  const label = getActivityLabel(activity.action_type);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
        <IconComponent className={`h-4 w-4 ${color}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {activity.buyer?.full_name && (
            <span className="font-medium text-sm truncate">
              {activity.buyer.full_name}
            </span>
          )}
          <Badge variant="outline" className="text-xs shrink-0">
            {label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">
          {activity.description}
        </p>
      </div>
      
      {/* Time */}
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDistanceToNow(new Date(activity.created_at), {
          addSuffix: false,
          locale: he,
        })}
      </span>
    </div>
  );
}

interface GlobalActivityFeedProps {
  limit?: number;
  className?: string;
}

export function GlobalActivityFeed({ limit = 50, className }: GlobalActivityFeedProps) {
  const { data: activities = [], isLoading } = useAllActivityLogs(limit);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          פעילות אחרונה
        </CardTitle>
        <Badge variant="outline" className="gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          בזמן אמת
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">אין פעילות עדיין</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] ios-scroll">
            <div className="divide-y divide-border">
              {activities.map((activity) => (
                <GlobalActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
