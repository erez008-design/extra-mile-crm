import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user roles from user_roles table
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error fetching roles:", error);
      await supabase.auth.signOut();
      navigate("/auth");
      return;
    }

    if (!roles || roles.length === 0) {
      console.error("No roles found for user");
      await supabase.auth.signOut();
      navigate("/auth");
      return;
    }

    // Get all roles for this user
    const userRoles = roles.map((r) => r.role);
    
    // Redirect based on role priority: admin > agent > client
    if (userRoles.includes("admin")) {
      navigate("/admin");
    } else if (userRoles.includes("agent")) {
      navigate("/agent");
    } else if (userRoles.includes("client")) {
      navigate("/properties");
    } else {
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">טוען...</p>
      </div>
    </div>
  );
};

export default Dashboard;
