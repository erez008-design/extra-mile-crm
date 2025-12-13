-- Step 1: Create Invitations Tables for buyer registration flow

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  message text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  accepted_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX idx_invites_token_hash ON public.invites(token_hash);
CREATE INDEX idx_invites_agent_id ON public.invites(agent_id);
CREATE INDEX idx_invites_status ON public.invites(status);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own invites"
ON public.invites FOR SELECT
USING (agent_id = auth.uid() OR has_role('admin'::app_role));

CREATE POLICY "Agents can create invites"
ON public.invites FOR INSERT
WITH CHECK (agent_id = auth.uid() AND (has_role('agent'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Agents can update their own invites"
ON public.invites FOR UPDATE
USING (agent_id = auth.uid() OR has_role('admin'::app_role));

CREATE POLICY "Agents can delete their own invites"
ON public.invites FOR DELETE
USING (agent_id = auth.uid() OR has_role('admin'::app_role));

-- Properties assigned to invitation
CREATE TABLE IF NOT EXISTS public.invite_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(invite_id, property_id)
);

CREATE INDEX idx_invite_properties_invite_id ON public.invite_properties(invite_id);
CREATE INDEX idx_invite_properties_property_id ON public.invite_properties(property_id);

ALTER TABLE public.invite_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view properties in their invites"
ON public.invite_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invites
    WHERE invites.id = invite_properties.invite_id
    AND (invites.agent_id = auth.uid() OR has_role('admin'::app_role))
  )
);

CREATE POLICY "Agents can add properties to their invites"
ON public.invite_properties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invites
    WHERE invites.id = invite_properties.invite_id
    AND (invites.agent_id = auth.uid() OR has_role('admin'::app_role))
  )
);

-- Step 2: Add source column to property_views to distinguish assigned vs viewed
ALTER TABLE public.property_views ADD COLUMN IF NOT EXISTS source text DEFAULT 'assigned' CHECK (source IN ('assigned', 'viewed'));

-- Step 3: Create Chat Tables for real-time agent/buyer communication

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agent_id, client_id)
);

CREATE INDEX idx_conversations_agent_id ON public.conversations(agent_id);
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (agent_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (agent_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
USING (agent_id = auth.uid() OR client_id = auth.uid());

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_property_id ON public.messages(property_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Function to update last_message_at on conversations
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();