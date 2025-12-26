import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export type AppRole = "admin" | "agent" | "client" | "manager";

export function useUserRole() {
  const [fallbackRoles, setFallbackRoles] = useState<AppRole[]>([]);
  
  const { data, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return roles?.map(r => r.role as AppRole) ?? [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const roles = data ?? fallbackRoles;
  const isManager = roles.includes("manager");
  const isAdmin = roles.includes("admin");
  const isAgent = roles.includes("agent");

  return {
    roles,
    isLoading,
    isManager,
    isAdmin,
    isAgent,
  };
}
