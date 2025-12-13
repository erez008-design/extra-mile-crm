import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface AddPropertyDialogProps {
  buyerId: string;
  onPropertyAdded: () => void;
}

export const AddPropertyDialog = ({ buyerId, onPropertyAdded }: AddPropertyDialogProps) => {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    price: "",
    description: "",
    contactPhone: "",
  });
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    const initializeAgentId = async () => {
      const agentFromUrl = searchParams.get("agent");
      if (agentFromUrl) {
        setAgentId(agentFromUrl);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setAgentId(session.user.id);
      }
    };
    
    initializeAgentId();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let property;
      
      const isAgent = session?.user?.id && agentId === session.user.id;
      
      if (isAgent) {
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .insert({
            address: formData.address,
            city: formData.city,
            price: parseFloat(formData.price),
            description: `${formData.description}\n\nטלפון: ${formData.contactPhone}`,
            created_by: session.user.id,
            agent_id: agentId,
          })
          .select()
          .single();

        if (propertyError) throw propertyError;
        property = propertyData;
      } else {
        if (!buyerId) {
          toast.error("שגיאה: חסר מזהה קונה. הקישור לא תקין.");
          return;
        }
        
        const { data: propertyId, error: rpcError } = await supabase
          .rpc('add_property_for_buyer', {
            p_buyer_id: buyerId,
            p_address: formData.address,
            p_city: formData.city,
            p_price: parseFloat(formData.price),
            p_description: `${formData.description}\n\nטלפון: ${formData.contactPhone}`,
          });

        if (rpcError) throw rpcError;
        
        const { data: propertyData, error: fetchError } = await supabase
          .from("properties")
          .select()
          .eq("id", propertyId)
          .single();
          
        if (fetchError) throw fetchError;
        property = propertyData;
      }

      if (image && property) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${property.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("property-images")
          .getPublicUrl(fileName);

        await supabase.from("property_images").insert({
          property_id: property.id,
          url: publicUrl,
          is_primary: true,
        });
      }

      if (isAgent && buyerId) {
        const { error: buyerPropertyError } = await supabase.from("buyer_properties").insert({
          buyer_id: buyerId,
          property_id: property.id,
          agent_id: agentId,
          status: "offered",
        });

        if (buyerPropertyError) {
          console.error("Error linking property to buyer:", buyerPropertyError);
          throw new Error("שגיאה בקישור הנכס לקונה");
        }
      }

      // Trigger real-time matching for the new property
      try {
        await supabase.functions.invoke("trigger-matching", {
          body: { 
            type: "property_change", 
            record: property 
          },
        });
      } catch (triggerError) {
        console.error("Error triggering matching:", triggerError);
        // Don't fail the property creation if trigger fails
      }

      toast.success("הנכס נוסף בהצלחה!");
      setOpen(false);
      setFormData({
        address: "",
        city: "",
        price: "",
        description: "",
        contactPhone: "",
      });
      setImage(null);
      onPropertyAdded();
    } catch (error: any) {
      console.error(error);
      toast.error("שגיאה בהוספת הנכס: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 ml-2" />
          הוסף נכס ידנית
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת נכס חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">כתובת *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">עיר *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">מחיר מבוקש (₪) *</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">תיאור קצר</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">טלפון איש קשר</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {image ? image.name : "לחץ להעלאת תמונה"}
                </div>
              </div>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="hidden"
              />
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "מוסיף..." : "הוסף נכס"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
