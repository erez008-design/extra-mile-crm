-- Create buyers table
CREATE TABLE IF NOT EXISTS public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by_agent_id UUID REFERENCES auth.users(id)
);

-- Create buyer_agents junction table
CREATE TABLE IF NOT EXISTS public.buyer_agents (
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (buyer_id, agent_id)
);

-- Create buyer_properties table
CREATE TABLE IF NOT EXISTS public.buyer_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'interested', 'seen', 'not_interested')),
  visited_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, property_id)
);

-- Create buyer_messages table
CREATE TABLE IF NOT EXISTS public.buyer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buyers
CREATE POLICY "Agents can view their buyers"
  ON public.buyers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_agents
      WHERE buyer_agents.buyer_id = buyers.id
      AND buyer_agents.agent_id = auth.uid()
    )
    OR has_role('admin'::app_role)
  );

CREATE POLICY "Agents can create buyers"
  ON public.buyers FOR INSERT
  WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can update their buyers"
  ON public.buyers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_agents
      WHERE buyer_agents.buyer_id = buyers.id
      AND buyer_agents.agent_id = auth.uid()
    )
    OR has_role('admin'::app_role)
  );

-- RLS Policies for buyer_agents
CREATE POLICY "Agents can view their buyer relationships"
  ON public.buyer_agents FOR SELECT
  USING (agent_id = auth.uid() OR has_role('admin'::app_role));

CREATE POLICY "Agents can create buyer relationships"
  ON public.buyer_agents FOR INSERT
  WITH CHECK (agent_id = auth.uid() OR has_role('admin'::app_role));

-- RLS Policies for buyer_properties
CREATE POLICY "Agents can manage buyer properties"
  ON public.buyer_properties FOR ALL
  USING (
    agent_id = auth.uid() 
    OR has_role('admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.buyer_agents
      WHERE buyer_agents.buyer_id = buyer_properties.buyer_id
      AND buyer_agents.agent_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view and update their properties"
  ON public.buyer_properties FOR ALL
  USING (
    buyer_id IN (
      SELECT id FROM public.buyers WHERE id = buyer_properties.buyer_id
    )
  );

-- RLS Policies for buyer_messages
CREATE POLICY "Agents can view their messages"
  ON public.buyer_messages FOR SELECT
  USING (agent_id = auth.uid() OR has_role('admin'::app_role));

CREATE POLICY "Anyone can insert buyer messages"
  ON public.buyer_messages FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyers_phone ON public.buyers(phone);
CREATE INDEX IF NOT EXISTS idx_buyer_agents_buyer_id ON public.buyer_agents(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_agents_agent_id ON public.buyer_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_buyer_properties_buyer_id ON public.buyer_properties(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_properties_status ON public.buyer_properties(status);
CREATE INDEX IF NOT EXISTS idx_buyer_messages_agent_id ON public.buyer_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_buyer_messages_buyer_id ON public.buyer_messages(buyer_id);