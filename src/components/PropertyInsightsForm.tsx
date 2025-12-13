import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface PropertyInsightsFormProps {
  buyerPropertyId: string;
  initialData: {
    status: string;
    not_interested_reason: string | null;
    liked_text: string | null;
    disliked_text: string | null;
  };
  onSaved?: () => void;
}

export const PropertyInsightsForm = ({ buyerPropertyId, initialData, onSaved }: PropertyInsightsFormProps) => {
  const [form, setForm] = useState({
    status: initialData.status || "offered",
    not_interested_reason: initialData.not_interested_reason || "",
    liked_text: initialData.liked_text || "",
    disliked_text: initialData.disliked_text || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buyer_properties")
        .update({
          status: form.status,
          not_interested_reason: form.not_interested_reason || null,
          liked_text: form.liked_text || null,
          disliked_text: form.disliked_text || null,
        })
        .eq("id", buyerPropertyId);

      if (error) throw error;

      toast.success("התובנות נשמרו בהצלחה");
      if (onSaved) onSaved();
    } catch (error: any) {
      console.error("Error saving insights:", error);
      toast.error("שגיאה בשמירת התובנות");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">תובנות על הנכס</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>סטטוס</Label>
          <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offered">הוצע</SelectItem>
              <SelectItem value="not_interested">לא מעוניין</SelectItem>
              <SelectItem value="seen">נראה</SelectItem>
              <SelectItem value="seen_and_liked">נראה ואהבתי</SelectItem>
              <SelectItem value="seen_and_disliked">נראה ולא אהבתי</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>למה לא מעוניין?</Label>
          <Textarea
            value={form.not_interested_reason}
            onChange={(e) => setForm({ ...form, not_interested_reason: e.target.value })}
            placeholder="למשל: רחוק מהעבודה, קומה גבוהה מדי..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>מה אהבת?</Label>
          <Textarea
            value={form.liked_text}
            onChange={(e) => setForm({ ...form, liked_text: e.target.value })}
            placeholder="למשל: מיקום מצוין, מרפסת גדולה..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>מה פחות אהבת?</Label>
          <Textarea
            value={form.disliked_text}
            onChange={(e) => setForm({ ...form, disliked_text: e.target.value })}
            placeholder="למשל: חניה רחוקה, צריך שיפוצים..."
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          <Save className="w-4 h-4 ml-2" />
          {saving ? "שומר..." : "שמור תובנות"}
        </Button>
      </CardContent>
    </Card>
  );
};
