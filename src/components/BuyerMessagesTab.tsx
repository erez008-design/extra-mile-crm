import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { safeDateDisplay } from "@/lib/safeDate";

interface BuyerMessage {
  id: string;
  buyer_id: string;
  property_id: string | null;
  agent_id: string;
  message: string;
  created_at: string;
}

export const BuyerMessagesTab = () => {
  const [messages, setMessages] = useState<BuyerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("נדרש להתחבר");
        return;
      }

      const { data, error } = await supabase
        .from("buyer_messages")
        .select("*")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("שגיאה בטעינת ההודעות");
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("שגיאה בטעינת ההודעות");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">טוען הודעות...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין הודעות מקונים</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">הודעה מלקוח</h3>
                <p className="text-sm text-muted-foreground">מזהה: {message.buyer_id.slice(0, 8)}...</p>
              </div>
              <Badge variant="secondary">
                {safeDateDisplay(message.created_at, (d) => format(d, "d MMMM yyyy, HH:mm", { locale: he }))}
              </Badge>
            </div>
            
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
