-- ============================================
-- COMPREHENSIVE RLS FIX FOR ALL TABLES
-- ============================================

-- First, ensure the has_role function exists
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

-- Helper function: Check if user is agent for a buyer
CREATE OR REPLACE FUNCTION public.is_agent_for_buyer(_user_id uuid, _buyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.buyer_agents
    WHERE agent_id = _user_id
      AND buyer_id = _buyer_id
  )
$$;

-- Helper function: Check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
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
      AND role IN ('manager', 'admin')
  )
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_extended_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods_lookup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_neighborhood_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.properties;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.buyers;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.neighborhoods_lookup;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.property_images;
DROP POLICY IF EXISTS "buyers_select_all" ON public.buyers;
DROP POLICY IF EXISTS "buyer_agents_select_all" ON public.buyer_agents;

-- ============================================
-- PROPERTIES TABLE POLICIES
-- ============================================
-- Agents can see all properties (needed for matching)
CREATE POLICY "properties_select_authenticated" ON public.properties
FOR SELECT TO authenticated
USING (true);

-- Agents can insert/update/delete their own properties
CREATE POLICY "properties_insert_agent" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "properties_update_agent" ON public.properties
FOR UPDATE TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "properties_delete_agent" ON public.properties
FOR DELETE TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- Public can view properties via buyer portal (for assigned properties)
CREATE POLICY "properties_select_public_portal" ON public.properties
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.buyer_properties bp
    WHERE bp.property_id = properties.id
  )
);

-- ============================================
-- BUYERS TABLE POLICIES
-- ============================================
-- Agents can see their assigned buyers
CREATE POLICY "buyers_select_agent" ON public.buyers
FOR SELECT TO authenticated
USING (
  public.is_agent_for_buyer(auth.uid(), id) 
  OR public.is_manager_or_admin(auth.uid())
  OR created_by_agent_id = auth.uid()
);

-- Agents can insert buyers
CREATE POLICY "buyers_insert_agent" ON public.buyers
FOR INSERT TO authenticated
WITH CHECK (true);

-- Agents can update their assigned buyers
CREATE POLICY "buyers_update_agent" ON public.buyers
FOR UPDATE TO authenticated
USING (
  public.is_agent_for_buyer(auth.uid(), id) 
  OR public.is_manager_or_admin(auth.uid())
  OR created_by_agent_id = auth.uid()
);

-- Agents can delete their assigned buyers
CREATE POLICY "buyers_delete_agent" ON public.buyers
FOR DELETE TO authenticated
USING (
  public.is_agent_for_buyer(auth.uid(), id) 
  OR public.is_manager_or_admin(auth.uid())
  OR created_by_agent_id = auth.uid()
);

-- ============================================
-- BUYER_AGENTS TABLE POLICIES
-- ============================================
CREATE POLICY "buyer_agents_select" ON public.buyer_agents
FOR SELECT TO authenticated
USING (
  agent_id = auth.uid() 
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "buyer_agents_insert" ON public.buyer_agents
FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "buyer_agents_delete" ON public.buyer_agents
FOR DELETE TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- ============================================
-- BUYER_PROPERTIES TABLE POLICIES
-- ============================================
CREATE POLICY "buyer_properties_select_agent" ON public.buyer_properties
FOR SELECT TO authenticated
USING (
  agent_id = auth.uid() 
  OR public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "buyer_properties_insert_agent" ON public.buyer_properties
FOR INSERT TO authenticated
WITH CHECK (
  agent_id = auth.uid() 
  OR public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "buyer_properties_update_agent" ON public.buyer_properties
FOR UPDATE TO authenticated
USING (
  agent_id = auth.uid() 
  OR public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "buyer_properties_delete_agent" ON public.buyer_properties
FOR DELETE TO authenticated
USING (
  agent_id = auth.uid() 
  OR public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

-- Public portal access for buyer_properties
CREATE POLICY "buyer_properties_select_public" ON public.buyer_properties
FOR SELECT TO anon
USING (true);

CREATE POLICY "buyer_properties_update_public" ON public.buyer_properties
FOR UPDATE TO anon
USING (true);

-- ============================================
-- MATCHES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "matches_insert_system" ON public.matches;
DROP POLICY IF EXISTS "matches_update_system" ON public.matches;

CREATE POLICY "matches_select_agent" ON public.matches
FOR SELECT TO authenticated
USING (
  public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

-- System can insert/update matches (for edge functions using service role)
CREATE POLICY "matches_insert_system" ON public.matches
FOR INSERT
WITH CHECK (true);

CREATE POLICY "matches_update_system" ON public.matches
FOR UPDATE
USING (true);

CREATE POLICY "matches_delete_agent" ON public.matches
FOR DELETE TO authenticated
USING (
  public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Agents can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Managers can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Agents can update their notification read status" ON public.notifications;
DROP POLICY IF EXISTS "Managers can update notification read status" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
FOR SELECT TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "notifications_update" ON public.notifications
FOR UPDATE TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "notifications_insert_system" ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================
-- PROPERTY_IMAGES TABLE POLICIES
-- ============================================
CREATE POLICY "property_images_select_auth" ON public.property_images
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "property_images_select_public" ON public.property_images
FOR SELECT TO anon
USING (true);

CREATE POLICY "property_images_insert_agent" ON public.property_images
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "property_images_update_agent" ON public.property_images
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "property_images_delete_agent" ON public.property_images
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- PROPERTY_DOCUMENTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "property_documents_select_all" ON public.property_documents;

CREATE POLICY "property_documents_select_auth" ON public.property_documents
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "property_documents_select_public" ON public.property_documents
FOR SELECT TO anon
USING (true);

CREATE POLICY "property_documents_insert_agent" ON public.property_documents
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "property_documents_update_agent" ON public.property_documents
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "property_documents_delete_agent" ON public.property_documents
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- PROPERTY_EXTENDED_DETAILS TABLE POLICIES
-- ============================================
CREATE POLICY "property_extended_details_select_auth" ON public.property_extended_details
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "property_extended_details_select_public" ON public.property_extended_details
FOR SELECT TO anon
USING (true);

CREATE POLICY "property_extended_details_insert" ON public.property_extended_details
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "property_extended_details_update" ON public.property_extended_details
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "property_extended_details_delete" ON public.property_extended_details
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- NEIGHBORHOODS_LOOKUP TABLE POLICIES
-- ============================================
CREATE POLICY "neighborhoods_select_all" ON public.neighborhoods_lookup
FOR SELECT
USING (true);

CREATE POLICY "neighborhoods_insert_auth" ON public.neighborhoods_lookup
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "neighborhoods_update_auth" ON public.neighborhoods_lookup
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- USER_ROLES TABLE POLICIES
-- ============================================
CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- Only admins can manage roles
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_update_admin" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- INVITES TABLE POLICIES
-- ============================================
CREATE POLICY "invites_select_agent" ON public.invites
FOR SELECT TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "invites_insert_agent" ON public.invites
FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "invites_update_agent" ON public.invites
FOR UPDATE TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- Public can view invites by token (for claiming)
CREATE POLICY "invites_select_public" ON public.invites
FOR SELECT TO anon
USING (true);

CREATE POLICY "invites_update_public" ON public.invites
FOR UPDATE TO anon
USING (true);

-- ============================================
-- INVITE_PROPERTIES TABLE POLICIES
-- ============================================
CREATE POLICY "invite_properties_select_auth" ON public.invite_properties
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "invite_properties_select_public" ON public.invite_properties
FOR SELECT TO anon
USING (true);

CREATE POLICY "invite_properties_insert" ON public.invite_properties
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "invite_properties_delete" ON public.invite_properties
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- ADMIN_NEIGHBORHOOD_ADDITIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "admin_neighborhood_additions_select_all" ON public.admin_neighborhood_additions;

CREATE POLICY "admin_neighborhoods_select" ON public.admin_neighborhood_additions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "admin_neighborhoods_insert" ON public.admin_neighborhood_additions
FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "admin_neighborhoods_update" ON public.admin_neighborhood_additions
FOR UPDATE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "admin_neighborhoods_delete" ON public.admin_neighborhood_additions
FOR DELETE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

-- ============================================
-- BUYER_MESSAGES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "buyer_messages_insert_all" ON public.buyer_messages;

CREATE POLICY "buyer_messages_select" ON public.buyer_messages
FOR SELECT TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_agent_for_buyer(auth.uid(), buyer_id)
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "buyer_messages_insert" ON public.buyer_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "buyer_messages_update" ON public.buyer_messages
FOR UPDATE TO authenticated
USING (agent_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));