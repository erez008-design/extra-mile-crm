import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, MessageSquare, Upload, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStats {
  id: string;
  full_name: string | null;
  email: string;
  total_buyers: number;
  whatsapp_sent: number;
  client_uploads: number;
}

interface AgentLeaderboardProps {
  selectedAgentId?: string;
}

export const AgentLeaderboard = ({ selectedAgentId }: AgentLeaderboardProps) => {
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentStats();
  }, [selectedAgentId]);

  const fetchAgentStats = async () => {
    setLoading(true);
    try {
      // Get all agents
      const { data: agentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "agent");

      if (!agentRoles || agentRoles.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      const agentIds = agentRoles.map((r) => r.user_id);

      // If filtering by agent, only get that agent
      const filteredIds = selectedAgentId && selectedAgentId !== "all" 
        ? [selectedAgentId] 
        : agentIds;

      // Get agent profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", filteredIds);

      if (!profiles) {
        setAgents([]);
        setLoading(false);
        return;
      }

      // Get stats for each agent
      const agentStats = await Promise.all(
        profiles.map(async (profile) => {
          // Count buyers linked to this agent
          const { count: buyersCount } = await supabase
            .from("buyer_agents")
            .select("*", { count: "exact", head: true })
            .eq("agent_id", profile.id);

          // Count WhatsApp messages sent
          const { count: whatsappCount } = await supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("agent_id", profile.id)
            .eq("action_type", "whatsapp_sent");

          // Count client uploads through buyer_agents relationship
          const { data: buyerIds } = await supabase
            .from("buyer_agents")
            .select("buyer_id")
            .eq("agent_id", profile.id);

          let uploadsCount = 0;
          if (buyerIds && buyerIds.length > 0) {
            const ids = buyerIds.map((b) => b.buyer_id);
            const { count } = await supabase
              .from("buyer_uploads")
              .select("*", { count: "exact", head: true })
              .in("buyer_id", ids);
            uploadsCount = count || 0;
          }

          return {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            total_buyers: buyersCount || 0,
            whatsapp_sent: whatsappCount || 0,
            client_uploads: uploadsCount,
          };
        })
      );

      // Sort by total_buyers descending
      agentStats.sort((a, b) => b.total_buyers - a.total_buyers);
      setAgents(agentStats);
    } catch (error) {
      console.error("Error fetching agent stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{index + 1}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            טבלת ביצועי סוכנים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          טבלת ביצועי סוכנים
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין סוכנים במערכת</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>שם הסוכן</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    קונים
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Upload className="w-4 h-4" />
                    קבצים
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent, index) => (
                <TableRow 
                  key={agent.id}
                  className={cn(
                    index === 0 && "bg-yellow-50 dark:bg-yellow-950/20",
                    index === 1 && "bg-gray-50 dark:bg-gray-900/20",
                    index === 2 && "bg-amber-50 dark:bg-amber-950/20"
                  )}
                >
                  <TableCell className="text-center">
                    {getMedalIcon(index)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{agent.full_name || "ללא שם"}</div>
                    <div className="text-xs text-muted-foreground">{agent.email}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                      {agent.total_buyers}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
                      {agent.whatsapp_sent}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                      {agent.client_uploads}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
