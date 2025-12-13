import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery token
    const checkRecoveryToken = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          toast.error("קישור לא תקין או שפג תוקפו");
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }
        
        setValidToken(true);
      } catch (error: any) {
        console.error("Error checking token:", error);
        toast.error("שגיאה בבדיקת הקישור");
        setTimeout(() => navigate("/auth"), 2000);
      } finally {
        setCheckingToken(false);
      }
    };

    checkRecoveryToken();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("שגיאה באיפוס הסיסמה: " + error.message);
      } else {
        toast.success("הסיסמה שונתה בהצלחה!");
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error("שגיאה באיפוס הסיסמה");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">בודק קישור...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/src/assets/extramile-logo.jpg" 
              alt="Extramile Logo" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">איפוס סיסמה</CardTitle>
          <CardDescription>הזן את הסיסמה החדשה שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">סיסמה חדשה</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="הזן סיסמה חדשה"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">אישור סיסמה</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הזן שוב את הסיסמה"
                required
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מאפס סיסמה...
                </>
              ) : (
                "שנה סיסמה"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
