import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription,
  DrawerFooter
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Phone, Loader2, Sparkles } from "lucide-react";

interface RegistrationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (buyerId: string, buyerName: string) => void;
  propertyId: string | null;
}

const RegistrationDrawer = ({ open, onOpenChange, onComplete, propertyId }: RegistrationDrawerProps) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  // Clean phone number (remove non-digits except +)
  const cleanPhone = (value: string) => {
    return value.replace(/[^\d+]/g, "");
  };

  // Validate phone number (Israeli format)
  const isValidPhone = (value: string) => {
    const cleaned = cleanPhone(value);
    // Israeli mobile: 05X-XXXXXXX (10 digits) or +972-5X-XXXXXXX
    return /^0[5][0-9]{8}$/.test(cleaned) || /^\+972[5][0-9]{8}$/.test(cleaned);
  };

  // Validate form
  const validate = () => {
    const newErrors: { fullName?: string; phone?: string } = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = "נא להזין שם מלא";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "השם קצר מדי";
    }

    if (!phone.trim()) {
      newErrors.phone = "נא להזין מספר טלפון";
    } else if (!isValidPhone(phone)) {
      newErrors.phone = "מספר טלפון לא תקין";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    const cleanedPhone = cleanPhone(phone);

    try {
      // Check if buyer already exists with this phone
      const { data: existingBuyer, error: checkError } = await supabase
        .from("buyers")
        .select("id, full_name")
        .eq("phone", cleanedPhone)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBuyer) {
        // Buyer exists - use existing record
        toast.success(`ברוך הבא בחזרה, ${existingBuyer.full_name}!`);
        onComplete(existingBuyer.id, existingBuyer.full_name);
        resetForm();
        return;
      }

      // Create new buyer as a lead
      const { data: newBuyer, error: insertError } = await supabase
        .from("buyers")
        .insert({
          full_name: fullName.trim(),
          phone: cleanedPhone,
          status: "lead"
        })
        .select("id, full_name")
        .single();

      if (insertError) throw insertError;

      // Log self-registration activity
      await supabase.from("activity_logs").insert({
        buyer_id: newBuyer.id,
        agent_id: null,
        action_type: "self_registered" as any,
        description: `קונה נרשם באופן עצמאי: ${fullName.trim()}`,
        metadata: { 
          source: "public_catalog", 
          phone: cleanedPhone,
          property_id: propertyId
        }
      });

      // Notify managers about new lead
      const { data: managers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["manager", "admin"]);

      if (managers && managers.length > 0) {
        // Insert notification for first manager (they can share internally)
        await supabase.from("notifications").insert({
          buyer_id: newBuyer.id,
          agent_id: managers[0].user_id,
          property_id: propertyId || "00000000-0000-0000-0000-000000000000", // Placeholder if no property
          match_score: 100,
          match_reason: "קונה חדש נרשם מהקטלוג הציבורי"
        });
      }

      toast.success("נרשמת בהצלחה! ברוך הבא ליומן הנכסים שלך");
      onComplete(newBuyer.id, newBuyer.full_name);
      resetForm();
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("שגיאה ברישום. נסה שנית");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setErrors({});
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir="rtl" className="max-h-[85vh]">
        <DrawerHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DrawerTitle className="text-xl">יומן נכסים אישי</DrawerTitle>
          <DrawerDescription>
            הירשם כדי לשמור נכסים, להוסיף הערות ולעקוב אחרי הנכסים שאהבת
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              שם מלא
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="ישראל ישראלי"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={errors.fullName ? "border-destructive" : ""}
              autoComplete="name"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              מספר טלפון
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="050-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={errors.phone ? "border-destructive" : ""}
              autoComplete="tel"
              dir="ltr"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
            <p className="text-xs text-muted-foreground">
              המספר ישמש לזיהוי שלך בביקורים הבאים
            </p>
          </div>

          <DrawerFooter className="px-0">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  נרשם...
                </>
              ) : (
                "התחל לשמור נכסים"
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};

export default RegistrationDrawer;
