import { ReactNode, useState } from "react";
import { Menu, X, Home, Building2, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import extraMileLogo from "@/assets/extramile-logo.jpg";

interface DashboardLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const navItems = [
  { label: "לוח בקרה", href: "/", icon: Home },
  { label: "נכסים", href: "/properties", icon: Building2 },
  { label: "קונים", href: "/buyers", icon: Users },
  { label: "סוכן", href: "/agent", icon: Settings },
];

export function DashboardLayout({ children, showNav = true }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {showNav && (
        <header className="border-b bg-card shadow-soft sticky top-0 z-50">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src={extraMileLogo} 
                  alt="EXTRAMILE" 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover cursor-pointer" 
                  onClick={() => navigate("/")}
                />
                <span className="font-semibold text-base sm:text-lg hidden sm:inline">EXTRAMILE</span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.href)}
                    className="gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                  יציאה
                </Button>
              </nav>

              {/* Mobile Hamburger Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">פתח תפריט</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0" dir="rtl">
                  <div className="flex flex-col h-full">
                    {/* Mobile Menu Header */}
                    <div className="flex items-center gap-3 p-4 border-b">
                      <img src={extraMileLogo} alt="EXTRAMILE" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="font-semibold text-lg">EXTRAMILE</span>
                    </div>

                    {/* Mobile Navigation Items */}
                    <nav className="flex-1 p-4 space-y-2">
                      {navItems.map((item) => (
                        <Button
                          key={item.href}
                          variant={isActive(item.href) ? "default" : "ghost"}
                          className="w-full justify-start gap-3 h-12 text-base"
                          onClick={() => {
                            navigate(item.href);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      ))}
                    </nav>

                    {/* Mobile Logout */}
                    <div className="p-4 border-t">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 h-12 text-base text-destructive hover:text-destructive"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-5 h-5" />
                        יציאה
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      )}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}