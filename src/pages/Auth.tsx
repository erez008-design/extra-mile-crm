import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import logoImage from "@/assets/extramile-logo.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectPath = searchParams.get('redirect');

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(redirectPath || "/");
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate(redirectPath || "/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = loginSchema.parse({ email, password });

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("אימייל או סיסמה שגויים");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("יש לאשר את כתובת המייל. בדוק את תיבת הדואר שלך.");
        } else {
          toast.error("שגיאה בהתחברות: " + error.message);
        }
      } else {
        toast.success("התחברת בהצלחה!");
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        console.error("Login error:", error);
        toast.error("שגיאה בהתחברות");
      }
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!fullName.trim()) {
        toast.error("נא למלא שם מלא");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone || null,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("כתובת המייל כבר רשומה במערכת");
        } else {
          toast.error("שגיאה בהרשמה: " + error.message);
        }
      } else {
        toast.success("נרשמת בהצלחה! מעביר לעמוד הראשי...");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error("שגיאה בהרשמה");
    }

    setLoading(false);
  };

  // Google OAuth disabled - using email/password only

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("נא להזין כתובת אימייל");
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("שגיאה בשליחת מייל לאיפוס סיסמה: " + error.message);
    } else {
      toast.success("נשלח אליך מייל לאיפוס סיסמה. בדוק את תיבת הדואר שלך.");
      setShowForgotPassword(false);
      setEmail("");
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <img src={logoImage} alt="EXTRAMILE Logo" className="h-16 object-contain" />
          </div>
          <CardTitle className="text-2xl">EXTRAMILE</CardTitle>
          <CardDescription className="text-base">קשרי נדל״ן - My Home Tracker</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">אימייל</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">סיסמה</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מתחבר...
                    </>
                  ) : (
                    "התחבר"
                  )}
                </Button>

                {showForgotPassword ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleForgotPassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          שולח מייל...
                        </>
                      ) : (
                        "שלח מייל לאיפוס סיסמה"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      ביטול
                    </Button>
                  </div>
                ) : (
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setShowForgotPassword(true)}
                >
                  שכחתי סיסמה
                </Button>
              )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">שם מלא *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">טלפון</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">אימייל *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">סיסמה *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      נרשם...
                    </>
                  ) : (
                    "הרשם"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
