import { Home, Users, UserPlus, Loader2, LogOut, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProperties } from "@/hooks/useProperties";
import { useProfiles, useUserCounts, ProfileWithRole } from "@/hooks/useProfiles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Dashboard() {
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const { data: counts, isLoading: countsLoading } = useUserCounts();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  const isLoading = propertiesLoading || profilesLoading || countsLoading;

  const getRoleBadge = (role: ProfileWithRole["role"]) => {
    switch (role) {
      case "client":
        return (
          <Badge className="bg-sky-100 text-sky-600 border-sky-200 hover:bg-sky-100">
            לקוח
          </Badge>
        );
      case "agent":
        return (
          <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-100">
            סוכן
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-100">
            מנהל
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            לא מוגדר
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">לוח בקרה - מנהל</h1>
              <p className="text-sm text-muted-foreground">EXTRAMILE</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="default" className="gap-2">
              <Upload className="h-4 w-4" />
              סנכרון מ-Webtiv
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              יציאה
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">לקוחות</p>
                <p className="text-3xl font-bold text-foreground">{counts?.clients || 0}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">סוכנים</p>
                <p className="text-3xl font-bold text-foreground">{counts?.agents || 0}</p>
              </div>
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">נכסים</p>
                <p className="text-3xl font-bold text-foreground">{properties.length}</p>
              </div>
              <Home className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            <TabsTrigger value="users" className="flex-1">משתמשים</TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">נכסים</TabsTrigger>
            <TabsTrigger value="buyers" className="flex-1">כל הקונים</TabsTrigger>
            <TabsTrigger value="technical" className="flex-1">נתונים טכניים</TabsTrigger>
            <TabsTrigger value="neighborhoods" className="flex-1">שכונות</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* User Management Section */}
        {activeTab === "users" && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">ניהול משתמשים</h2>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  הוסף משתמש
                </Button>
              </div>

              <div className="space-y-4">
                {profiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">אין משתמשים להצגה</p>
                ) : (
                  profiles.map((profile) => (
                    <Card key={profile.id} className="border-border">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>{getRoleBadge(profile.role)}</div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">
                            {profile.full_name || "ללא שם"}
                          </p>
                          {profile.email && (
                            <p className="text-sm text-primary">{profile.email}</p>
                          )}
                          {profile.phone && (
                            <p className="text-sm text-primary">{profile.phone}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "properties" && (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">עבור לעמוד נכסים לצפייה מלאה</p>
            </CardContent>
          </Card>
        )}

        {activeTab === "buyers" && (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">עבור לעמוד קונים לצפייה מלאה</p>
            </CardContent>
          </Card>
        )}

        {activeTab === "technical" && (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">נתונים טכניים יופיעו כאן</p>
            </CardContent>
          </Card>
        )}

        {activeTab === "neighborhoods" && (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground py-8">שכונות יופיעו כאן</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
