-- Drop and recreate all policies to ensure consistency
DROP POLICY IF EXISTS "Buyers can insert properties they found" ON public.properties;
DROP POLICY IF EXISTS "Buyers can link properties to themselves" ON public.buyer_properties;
DROP POLICY IF EXISTS "Agents can view their messages" ON public.buyer_messages;
DROP POLICY IF EXISTS "Anyone can insert buyer messages" ON public.buyer_messages;

-- Fix RLS policies for property insertion by buyers
CREATE POLICY "Buyers can insert properties they found"
ON public.properties
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix RLS policy for buyer_properties insertion
CREATE POLICY "Buyers can link properties to themselves"
ON public.buyer_properties
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create buyer_messages table for buyer-to-agent communication (IF NOT EXISTS will handle if table exists)
CREATE TABLE IF NOT EXISTS public.buyer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on buyer_messages
ALTER TABLE public.buyer_messages ENABLE ROW LEVEL SECURITY;

-- Agents can view their messages
CREATE POLICY "Agents can view their messages"
ON public.buyer_messages
FOR SELECT
TO authenticated
USING (agent_id = auth.uid() OR has_role('admin'));

-- Anyone can insert buyer messages (for public buyer portal)
CREATE POLICY "Anyone can insert buyer messages"
ON public.buyer_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_buyer_messages_agent_id ON public.buyer_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_buyer_messages_buyer_id ON public.buyer_messages(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_messages_created_at ON public.buyer_messages(created_at DESC);