-- Create the has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create notifications table for AI match alerts
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  match_score integer NOT NULL,
  match_reason text,
  is_read_by_agent boolean NOT NULL DEFAULT false,
  is_read_by_manager boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can see their own notifications
CREATE POLICY "Agents can view their notifications"
ON public.notifications
FOR SELECT
USING (agent_id = auth.uid());

-- Policy: Managers can view all notifications
CREATE POLICY "Managers can view all notifications"
ON public.notifications
FOR SELECT
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Policy: Agents can update their read status
CREATE POLICY "Agents can update their notification read status"
ON public.notifications
FOR UPDATE
USING (agent_id = auth.uid());

-- Policy: Managers can update manager read status
CREATE POLICY "Managers can update notification read status"
ON public.notifications
FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'::app_role));

-- Policy: System can insert notifications (for edge functions)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_agent_id ON public.notifications(agent_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read_agent ON public.notifications(is_read_by_agent) WHERE is_read_by_agent = false;
CREATE INDEX idx_notifications_is_read_manager ON public.notifications(is_read_by_manager) WHERE is_read_by_manager = false;