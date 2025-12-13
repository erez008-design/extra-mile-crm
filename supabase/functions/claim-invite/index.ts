import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const ClaimRequestSchema = z.object({
  token: z.string().trim().min(10).max(500),
});

interface ClaimRequest {
  token: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token } = ClaimRequestSchema.parse(await req.json());
    console.log('Claiming invite with token:', token);

    // Find invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select(`
        *,
        invite_properties (
          property_id
        )
      `)
      .eq('token_hash', token)
      .single();

    if (inviteError || !invite) {
      console.error('Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invitation already accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Ensure user has client role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!existingRoles || existingRoles.length === 0) {
      await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'client' });
      console.log('Added client role to user');
    }

    // 2. Link client to agent in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ agent_id: invite.agent_id })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error linking to agent:', profileError);
    }

    // 3. Create property_views for all invited properties
    const propertyViews = invite.invite_properties.map((ip: any) => ({
      client_id: user.id,
      property_id: ip.property_id,
      source: 'assigned'
    }));

    const { error: viewsError } = await supabase
      .from('property_views')
      .upsert(propertyViews, {
        onConflict: 'client_id,property_id',
        ignoreDuplicates: true
      });

    if (viewsError) {
      console.error('Error creating property views:', viewsError);
    }

    // 4. Mark invite as accepted
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite status:', updateError);
    }

    // 5. Create initial conversation with agent
    const { error: convError } = await supabase
      .from('conversations')
      .upsert({
        agent_id: invite.agent_id,
        client_id: user.id
      }, {
        onConflict: 'agent_id,client_id',
        ignoreDuplicates: true
      });

    if (convError) {
      console.error('Error creating conversation:', convError);
    }

    console.log('Invite claimed successfully for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        propertyCount: propertyViews.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in claim-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
