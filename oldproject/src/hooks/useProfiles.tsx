import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileWithRole {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "admin" | "agent" | "client" | null;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      return (profiles || []).map((profile) => ({
        ...profile,
        role: rolesMap.get(profile.id) || null,
      })) as ProfileWithRole[];
    },
  });
}

export function useUserCounts() {
  return useQuery({
    queryKey: ["user-counts"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role");

      if (error) throw error;

      const clients = roles?.filter((r) => r.role === "client").length || 0;
      const agents = roles?.filter((r) => r.role === "agent").length || 0;
      const admins = roles?.filter((r) => r.role === "admin").length || 0;

      return { clients, agents, admins };
    },
  });
}
