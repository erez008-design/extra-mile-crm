-- Create action_type enum
CREATE TYPE public.activity_action_type AS ENUM (
  'property_offered',
  'note_added',
  'feedback_added',
  'link_viewed',
  'status_changed',
  'buyer_created',
  'match_found'
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE CASCADE,
  agent_id uuid,
  action_type activity_action_type NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_activity_logs_buyer_id ON public.activity_logs(buyer_id);
CREATE INDEX idx_activity_logs_agent_id ON public.activity_logs(agent_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Agents see their buyers' activities, managers see all
CREATE POLICY "activity_logs_select_agent" ON public.activity_logs
  FOR SELECT USING (
    is_agent_for_buyer(auth.uid(), buyer_id) 
    OR is_manager_or_admin(auth.uid())
    OR agent_id = auth.uid()
  );

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Enable realtime for activity_logs
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- Trigger function for buyer_properties INSERT (property offered)
CREATE OR REPLACE FUNCTION public.log_property_offered()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_name text;
  v_property_address text;
BEGIN
  SELECT full_name INTO v_buyer_name FROM public.buyers WHERE id = NEW.buyer_id;
  SELECT address INTO v_property_address FROM public.properties WHERE id = NEW.property_id;
  
  INSERT INTO public.activity_logs (buyer_id, agent_id, action_type, description, metadata)
  VALUES (
    NEW.buyer_id,
    NEW.agent_id,
    'property_offered',
    'נכס הוצע ללקוח: ' || COALESCE(v_property_address, 'לא ידוע'),
    jsonb_build_object('property_id', NEW.property_id, 'buyer_name', v_buyer_name, 'property_address', v_property_address)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_property_offered
AFTER INSERT ON public.buyer_properties
FOR EACH ROW EXECUTE FUNCTION public.log_property_offered();

-- Trigger function for buyer_properties UPDATE (status changed)
CREATE OR REPLACE FUNCTION public.log_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_name text;
  v_property_address text;
  v_old_status text;
  v_new_status text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT full_name INTO v_buyer_name FROM public.buyers WHERE id = NEW.buyer_id;
    SELECT address INTO v_property_address FROM public.properties WHERE id = NEW.property_id;
    
    v_old_status := COALESCE(OLD.status, 'offered');
    v_new_status := COALESCE(NEW.status, 'offered');
    
    INSERT INTO public.activity_logs (buyer_id, agent_id, action_type, description, metadata)
    VALUES (
      NEW.buyer_id,
      NEW.agent_id,
      'status_changed',
      'סטטוס שונה מ-' || v_old_status || ' ל-' || v_new_status || ' עבור ' || COALESCE(v_property_address, 'נכס'),
      jsonb_build_object('property_id', NEW.property_id, 'old_status', v_old_status, 'new_status', v_new_status, 'property_address', v_property_address)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_status_changed
AFTER UPDATE ON public.buyer_properties
FOR EACH ROW EXECUTE FUNCTION public.log_status_changed();

-- Trigger function for agent_feedback added
CREATE OR REPLACE FUNCTION public.log_feedback_added()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_name text;
  v_property_address text;
BEGIN
  IF OLD.agent_feedback IS DISTINCT FROM NEW.agent_feedback AND NEW.agent_feedback IS NOT NULL AND NEW.agent_feedback != '' THEN
    SELECT full_name INTO v_buyer_name FROM public.buyers WHERE id = NEW.buyer_id;
    SELECT address INTO v_property_address FROM public.properties WHERE id = NEW.property_id;
    
    INSERT INTO public.activity_logs (buyer_id, agent_id, action_type, description, metadata)
    VALUES (
      NEW.buyer_id,
      NEW.agent_id,
      'feedback_added',
      'הערת סוכן נוספה עבור ' || COALESCE(v_property_address, 'נכס'),
      jsonb_build_object('property_id', NEW.property_id, 'feedback', NEW.agent_feedback, 'property_address', v_property_address)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_feedback_added
AFTER UPDATE ON public.buyer_properties
FOR EACH ROW EXECUTE FUNCTION public.log_feedback_added();

-- Trigger function for property_views INSERT (link viewed)
CREATE OR REPLACE FUNCTION public.log_link_viewed()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_id uuid;
  v_property_address text;
BEGIN
  -- Get buyer_id from buyer_properties if exists
  SELECT bp.buyer_id INTO v_buyer_id 
  FROM public.buyer_properties bp 
  WHERE bp.property_id = NEW.property_id 
  LIMIT 1;
  
  SELECT address INTO v_property_address FROM public.properties WHERE id = NEW.property_id;
  
  IF v_buyer_id IS NOT NULL THEN
    INSERT INTO public.activity_logs (buyer_id, agent_id, action_type, description, metadata)
    VALUES (
      v_buyer_id,
      NULL,
      'link_viewed',
      'לקוח צפה בנכס: ' || COALESCE(v_property_address, 'לא ידוע'),
      jsonb_build_object('property_id', NEW.property_id, 'source', NEW.source, 'property_address', v_property_address, 'client_id', NEW.client_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_link_viewed
AFTER INSERT ON public.property_views
FOR EACH ROW EXECUTE FUNCTION public.log_link_viewed();