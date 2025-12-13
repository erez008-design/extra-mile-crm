import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import logoImage from "@/assets/extramile-logo.jpg";

const Invite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    checkInviteAndAuth();
  }, [token]);

  const checkInviteAndAuth = async () => {
    if (!token || token === ':token' || token.includes(':')) {
      setError("קישור לא תקין - נא להשתמש בקישור שנשלח במייל");
      setLoading(false);
      return;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // User is logged in, claim immediately
      await claimInvite();
    } else {
      // User not logged in, show invite details
      await fetchInviteDetails();
    }
  };

  const fetchInviteDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          profiles:agent_id (full_name),
          invite_properties (
            properties (
              address,
              city,
              price
            )
          )
        `)
        .eq('token_hash', token)
        .single();

      if (error || !data) {
        setError("הזמנה לא נמצאה או פגה תוקף");
      } else if (data.status === 'accepted') {
        setError("הזמנה זו כבר נוצלה");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("הזמנה זו פגה תוקף");
      } else {
        setInvite(data);
      }
    } catch (err) {
      console.error("Error fetching invite:", err);
      setError("שגיאה בטעינת ההזמנה");
    }
    setLoading(false);
  };

  const claimInvite = async () => {
    setClaiming(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("נא להתחבר תחילה");
        navigate(`/auth?redirect=/invite/${token}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke('claim-invite', {
        body: { token }
      });

      if (error) throw error;

      toast.success(`🎉 קיבלת גישה ל-${data.propertyCount} נכסים!`);
      navigate("/properties");
    } catch (err: any) {
      console.error("Error claiming invite:", err);
      toast.error(err.message || "שגיאה בקבלת ההזמנה");
    }
    
    setClaiming(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <img src={logoImage} alt="EXTRAMILE" className="h-16 mx-auto mb-4 object-contain" />
            <CardTitle className="text-xl text-destructive">{error}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")}>
              עבור להתחברות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-2xl shadow-medium">
        <CardHeader className="text-center space-y-3">
          <img src={logoImage} alt="EXTRAMILE" className="h-16 mx-auto object-contain" />
          <CardTitle className="text-2xl">קיבלת הזמנה לצפות בנכסים!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <p className="font-semibold">
                {invite?.profiles?.full_name || "סוכן"} שיתף אתך {invite?.invite_properties?.length || 0} נכסים
              </p>
            </div>
            {invite?.message && (
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">
                {invite.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">הנכסים שלך:</h3>
            {invite?.invite_properties?.slice(0, 3).map((ip: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ip.properties.address}</p>
                  <p className="text-sm text-muted-foreground">{ip.properties.city} • ₪{ip.properties.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {invite?.invite_properties?.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                ועוד {invite.invite_properties.length - 3} נכסים נוספים...
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={claimInvite}
              disabled={claiming}
            >
              {claiming ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  מעבד...
                </>
              ) : (
                "התחבר וצפה בנכסים"
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              ע״י לחיצה על הכפתור, תועבר לדף התחברות ולאחר מכן תקבל גישה לנכסים
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;
