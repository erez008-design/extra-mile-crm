import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "agent" | "client" | "manager";

export function useUserRole() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return roles?.map(r => r.role as AppRole) ?? [];
    },
  });

  const isManager = data?.includes("manager") ?? false;
  const isAdmin = data?.includes("admin") ?? false;
  const isAgent = data?.includes("agent") ?? false;

  return {
    roles: data ?? [],
    isLoading,
    isManager,
    isAdmin,
    isAgent,
  };
}
