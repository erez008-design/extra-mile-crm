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
import { 
  useBuyerActivityLogs, 
  getActivityIcon, 
  getActivityLabel,
  ActivityLog,
  ActivityActionType 
} from "@/hooks/useActivityLogs";

interface ActivityTimelineProps {
  buyerId: string;
}

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

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const { icon, color, bgColor } = getActivityIcon(activity.action_type);
  const IconComponent = iconMap[icon] || Activity;
  const label = getActivityLabel(activity.action_type);

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
      
      {/* Icon */}
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
        <IconComponent className={`h-5 w-5 ${color}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true,
              locale: he,
            })}
          </span>
        </div>
        <p className="text-sm text-foreground">{activity.description}</p>
        
        {/* Show metadata details if available */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {activity.metadata.new_status && (
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {String(activity.metadata.old_status)} → {String(activity.metadata.new_status)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityTimeline({ buyerId }: ActivityTimelineProps) {
  const { data: activities = [], isLoading } = useBuyerActivityLogs(buyerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">אין פעילות עדיין</p>
        <p className="text-sm text-muted-foreground/70">
          פעילויות יופיעו כאן כאשר תתבצע פעולה על הלקוח
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100dvh-280px)] pr-2 ios-scroll">
      <div className="space-y-0">
        {activities.map((activity) => (
          <ActivityItem 
            key={activity.id} 
            activity={activity} 
          />
        ))}
      </div>
    </ScrollArea>
  );
}
