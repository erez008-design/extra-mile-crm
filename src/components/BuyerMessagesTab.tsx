import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface BuyerMessage {
  id: string;
  buyer_id: string;
  property_id: string | null;
  message: string;
  created_at: string;
  buyers: {
    full_name: string;
    phone: string;
  };
  properties?: {
    address: string;
    city: string;
  };
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
        .select(`
          *,
          buyers (full_name, phone),
          properties (address, city)
        `)
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
                <h3 className="font-semibold text-lg">{message.buyers.full_name}</h3>
                <p className="text-sm text-muted-foreground">{message.buyers.phone}</p>
              </div>
              <Badge variant="secondary">
                {format(new Date(message.created_at), "d MMMM yyyy, HH:mm", { locale: he })}
              </Badge>
            </div>
            
            {message.properties && (
              <div className="mb-3 p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium">נכס מקושר:</p>
                <p className="text-sm text-muted-foreground">
                  {message.properties.address}, {message.properties.city}
                </p>
              </div>
            )}
            
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
