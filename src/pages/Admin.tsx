import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Building2, Users, Home, UserPlus, Upload, RefreshCw, MapPin, Trash2, Download, AlertTriangle, Pencil, BarChart3, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createUserSchema } from "@/lib/validations";
import { AdminNeighborhoodManager } from "@/components/AdminNeighborhoodManager";
import { ExclusionAnalyticsChart } from "@/components/ExclusionAnalyticsChart";
import { AdminPropertyExtendedDetails } from "@/components/AdminPropertyExtendedDetails";
import { AdminAllBuyers } from "@/components/AdminAllBuyers";
import { EditPropertyModal } from "@/components/EditPropertyModal";
import { isPropertyIncomplete } from "@/hooks/usePropertyEnrichment";
import { subDays } from "date-fns";
import { Settings2, ShoppingCart } from "lucide-react";
import { AgentLeaderboard } from "@/components/admin/AgentLeaderboard";
import { GrowthCharts } from "@/components/admin/GrowthCharts";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState({ clients: 0, agents: 0, properties: 0 });
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", phone: "", role: "client", password: "" });
  const [exclusionReasons, setExclusionReasons] = useState<Array<{reason: string; count: number}>>([]);
  const [analyticsStartDate, setAnalyticsStartDate] = useState<Date | null>(subDays(new Date(), 30));
  const [analyticsEndDate, setAnalyticsEndDate] = useState<Date | null>(new Date());
  const [selectedAgentForAnalytics, setSelectedAgentForAnalytics] = useState<string>("all");
  const [agents, setAgents] = useState<Array<{id: string; full_name: string | null; email: string}>>([]);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [selectedStatsAgent, setSelectedStatsAgent] = useState<string>("all");
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user has admin role
    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      navigate("/");
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch users with their roles
    const { data: usersData } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        phone,
        agent_id,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (usersData) {
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        usersData.map(async (user) => {
          const { data: roleData } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .limit(1)
            .single();
          
          return {
            ...user,
            role: roleData?.role || "client"
          };
        })
      );

      setUsers(usersWithRoles);
      const clientCount = usersWithRoles.filter((u: any) => u.role === "client").length;
      const agentCount = usersWithRoles.filter((u: any) => u.role === "agent").length;
      setStats(prev => ({ ...prev, clients: clientCount, agents: agentCount }));
    }

    // Fetch properties
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (propertiesData) {
      setProperties(propertiesData);
      setStats(prev => ({ ...prev, properties: propertiesData.length }));
    }

    // Fetch exclusion reasons analytics
    fetchExclusionReasons();

    // Fetch agents for analytics filter
    fetchAgents();

    setLoading(false);
  };

  const fetchExclusionReasons = async (startDate?: Date | null, endDate?: Date | null, agentId?: string | null) => {
    const params: { start_date?: string; end_date?: string; agent_id?: string } = {};
    
    if (startDate) {
      params.start_date = startDate.toISOString();
    }
    if (endDate) {
      params.end_date = endDate.toISOString();
    }
    if (agentId && agentId !== "all") {
      params.agent_id = agentId;
    }
    
    const { data, error } = await supabase.rpc('get_top_exclusion_reasons', params);
    if (data && !error) {
      setExclusionReasons(data);
    }
  };

  const fetchAgents = async () => {
    // Get all agents by checking user_roles table
    const { data: agentRoles } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "agent");

    if (agentRoles && agentRoles.length > 0) {
      const agentIds = agentRoles.map((r: any) => r.user_id);
      
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", agentIds);

      if (data) {
        setAgents(data);
      }
    }
  };

  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setAnalyticsStartDate(startDate);
    setAnalyticsEndDate(endDate);
    fetchExclusionReasons(startDate, endDate, selectedAgentForAnalytics);
  };

  const handleAgentFilterChange = (agentId: string) => {
    setSelectedAgentForAnalytics(agentId);
    fetchExclusionReasons(analyticsStartDate, analyticsEndDate, agentId);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק נכס זה? פעולה זו אינה ניתנת לביטול.")) {
      return;
    }

    try {
      // Delete related records first
      await supabase.from("buyer_properties").delete().eq("property_id", propertyId);
      await supabase.from("property_images").delete().eq("property_id", propertyId);
      await supabase.from("property_documents").delete().eq("property_id", propertyId);
      await supabase.from("matches").delete().eq("property_id", propertyId);
      
      // Delete the property itself
      const { error } = await supabase.from("properties").delete().eq("id", propertyId);
      
      if (error) throw error;
      
      toast.success("הנכס נמחק בהצלחה");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error("שגיאה במחיקת הנכס");
    }
  };

  const handleExportCSV = () => {
    if (properties.length === 0) {
      toast.error("אין נכסים לייצוא");
      return;
    }

    const headers = ["id", "address", "city", "price", "rooms", "date_added", "agent_id"];
    const csvRows = [
      headers.join(","),
      ...properties.map(p => [
        p.id,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${(p.city || '').replace(/"/g, '""')}"`,
        p.price || 0,
        p.rooms || '',
        p.created_at ? new Date(p.created_at).toLocaleDateString('he-IL') : '',
        p.agent_id || ''
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("הקובץ יוצא בהצלחה");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddUser = async () => {
    try {
      if (!newUser.email || !newUser.password) {
        toast.error("נא למלא אימייל וסיסמה");
        return;
      }

      const password = newUser.password || Math.random().toString(36).slice(-8) + "A1!";
      
      // Create user through Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: password,
        options: {
          data: {
            full_name: newUser.full_name,
            phone: newUser.phone || null,
            role: newUser.role,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("כתובת המייל כבר רשומה במערכת");
        } else {
          toast.error("שגיאה ביצירת משתמש: " + signUpError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("שגיאה ביצירת משתמש");
        return;
      }

      // If agent role, update the role in user_roles table
      if (newUser.role === 'agent' || newUser.role === 'admin') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: newUser.role })
          .eq('user_id', authData.user.id);

        if (roleError) {
          console.error("Error updating role:", roleError);
        }
      }

      const successMessage = `${newUser.role === 'agent' ? 'סוכן' : 'משתמש'} נוסף בהצלחה. ${newUser.password ? '' : 'סיסמה זמנית: ' + password}`;
      toast.success(successMessage);
      
      setShowAddUser(false);
      setNewUser({ email: "", full_name: "", phone: "", role: "client", password: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error("שגיאה בהוספת משתמש");
    }
  };

  const handleSyncFromWebtiv = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-webtiv');

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `סנכרון הושלם בהצלחה!\n` +
          `נכסים שנוספו: ${data.inserted}\n` +
          `נכסים ללא תמונות: ${data.filtered['no-picture']}\n` +
          `סוכנים שנוספו: ${data.insertedAgents}\n` +
          `תמונות שנוספו: ${data.totalImages}`
        );
        fetchData();
      } else {
        throw new Error(data?.error || 'שגיאה לא ידועה');
      }
    } catch (error: any) {
      console.error("Error syncing from Webtiv:", error);
      toast.error("שגיאה בסנכרון מ-Webtiv: " + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      toast.error("נא להזין סיסמה חדשה");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: resetPasswordUser.id, action: 'reset-password', newPassword }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`הסיסמה עודכנה בהצלחה עבור ${resetPasswordUser.full_name || resetPasswordUser.email}`);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error("שגיאה באיפוס סיסמה: " + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${user.full_name || user.email}? פעולה זו אינה ניתנת לביטול.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id, action: 'delete-user' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`המשתמש ${user.full_name || user.email} נמחק בהצלחה`);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("שגיאה במחיקת משתמש: " + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">לוח בקרה - מנהל</h1>
                <p className="text-sm text-muted-foreground">EXTRAMILE</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSyncFromWebtiv}
                disabled={loading}
              >
                <Upload className="w-4 h-4 ml-2" />
                סנכרון מ-Webtiv
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 ml-2" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">לקוחות</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">סוכנים</CardTitle>
              <UserPlus className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.agents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">נכסים</CardTitle>
              <Home className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.properties}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stats" dir="rtl">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              סטטיסטיקות
            </TabsTrigger>
            <TabsTrigger value="users">משתמשים</TabsTrigger>
            <TabsTrigger value="properties">נכסים</TabsTrigger>
            <TabsTrigger value="buyers">כל הקונים</TabsTrigger>
            <TabsTrigger value="technical">נתונים טכניים</TabsTrigger>
            <TabsTrigger value="neighborhoods">שכונות</TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="space-y-6">
              {/* Agent Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="text-base">סינון לפי סוכן</CardTitle>
                    <Select value={selectedStatsAgent} onValueChange={setSelectedStatsAgent}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="בחר סוכן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל הסוכנים</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.full_name || agent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              {/* Growth Charts */}
              <GrowthCharts selectedAgentId={selectedStatsAgent} />

              {/* Agent Leaderboard */}
              <AgentLeaderboard selectedAgentId={selectedStatsAgent} />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ניהול משתמשים</CardTitle>
                  <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 ml-2" />
                        הוסף משתמש
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>הוספת משתמש חדש</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">אימייל *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            dir="ltr"
                            className="h-11"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">שם מלא *</Label>
                          <Input
                            id="full_name"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                            className="h-11"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">טלפון</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={newUser.phone}
                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">סיסמה (אופציונלי - אם ריק, תיווצר סיסמה אוטומטית)</Label>
                          <Input
                            id="password"
                            type="text"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="h-11"
                            placeholder="השאר ריק ליצירת סיסמה אוטומטית"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">תפקיד *</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">לקוח</SelectItem>
                              <SelectItem value="agent">סוכן</SelectItem>
                              <SelectItem value="admin">מנהל</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleAddUser} className="w-full h-11">
                          צור משתמש
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name || user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-muted-foreground">{user.phone}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {user.role === "admin" && <span className="px-2 py-1 rounded bg-destructive/10 text-destructive">מנהל</span>}
                          {user.role === "agent" && <span className="px-2 py-1 rounded bg-accent/10 text-accent">סוכן</span>}
                          {user.role === "client" && <span className="px-2 py-1 rounded bg-primary/10 text-primary">לקוח</span>}
                        </span>
                        {user.role === "agent" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setResetPasswordUser(user)}
                              title="איפוס סיסמה"
                              disabled={actionLoading}
                            >
                              <KeyRound className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user)}
                              title="מחק סוכן"
                              disabled={actionLoading}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader>
                  <DialogTitle>איפוס סיסמה</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    איפוס סיסמה עבור: <strong>{resetPasswordUser?.full_name || resetPasswordUser?.email}</strong>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">סיסמה חדשה</Label>
                    <Input
                      id="newPassword"
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11"
                      placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                    />
                  </div>
                  <Button 
                    onClick={handleResetPassword} 
                    className="w-full h-11"
                    disabled={actionLoading || !newPassword}
                  >
                    {actionLoading ? "מעדכן..." : "עדכן סיסמה"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="properties">
            <div className="space-y-6">
              {/* Agent Filter for Analytics */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="text-base">סינון לפי סוכן</CardTitle>
                    <Select value={selectedAgentForAnalytics} onValueChange={handleAgentFilterChange}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="בחר סוכן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל הסוכנים</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.full_name || agent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              {/* Exclusion Analytics Card */}
              <ExclusionAnalyticsChart 
                data={exclusionReasons} 
                onDateRangeChange={handleDateRangeChange}
                title={selectedAgentForAnalytics !== "all" 
                  ? `סיבות אי-התאמה - ${agents.find(a => a.id === selectedAgentForAnalytics)?.full_name || 'סוכן נבחר'}`
                  : undefined
                }
              />

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle>ניהול נכסים</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="showIncompleteOnly"
                          checked={showIncompleteOnly}
                          onCheckedChange={setShowIncompleteOnly}
                        />
                        <Label htmlFor="showIncompleteOnly" className="text-sm cursor-pointer">
                          הצג חסרי מידע בלבד
                        </Label>
                      </div>
                      <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 ml-2" />
                        ייצוא CSV
                      </Button>
                      <Button onClick={() => navigate("/agent")}>
                        <Home className="w-4 h-4 ml-2" />
                        הוסף נכס
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {properties.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">אין נכסים עדיין</p>
                    ) : (
                      properties
                        .filter(property => !showIncompleteOnly || isPropertyIncomplete(property))
                        .map((property: any) => (
                          <div
                            key={property.id}
                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div 
                              className="flex-1 cursor-pointer" 
                              onClick={() => navigate(`/property/${property.id}`)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{property.address}</div>
                                {isPropertyIncomplete(property) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    חסר מידע
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{property.city}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-semibold text-primary">
                                ₪{property.price?.toLocaleString() || 0}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProperty(property);
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProperty(property.id);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Edit Property Modal */}
              <EditPropertyModal
                property={editingProperty}
                open={!!editingProperty}
                onOpenChange={(open) => !open && setEditingProperty(null)}
                onSaved={() => {
                  setEditingProperty(null);
                  fetchData();
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="buyers">
            <AdminAllBuyers />
          </TabsContent>

          <TabsContent value="technical">
            <AdminPropertyExtendedDetails />
          </TabsContent>

          <TabsContent value="neighborhoods">
            <AdminNeighborhoodManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
