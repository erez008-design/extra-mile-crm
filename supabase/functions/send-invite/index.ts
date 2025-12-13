import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InviteRequestSchema = z.object({
  propertyIds: z.array(z.string().uuid()).min(1).max(50),
  message: z.string().max(1000).optional(),
  clientName: z.string().trim().min(1).max(100).optional(),
});

interface InviteRequest {
  propertyIds: string[];
  message?: string;
  clientName?: string;
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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { propertyIds, message, clientName } = InviteRequestSchema.parse(await req.json());
    console.log('Creating invite for:', { clientName, propertyCount: propertyIds.length });

    // Generate unique token
    const token_hash = crypto.randomUUID();

    // Create invite (email is optional now, just for tracking)
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        agent_id: user.id,
        email: clientName || 'לקוח',
        token_hash,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      throw new Error('Failed to create invite');
    }

    // Add properties to invite
    const inviteProperties = propertyIds.map(property_id => ({
      invite_id: invite.id,
      property_id
    }));

    const { error: propsError } = await supabase
      .from('invite_properties')
      .insert(inviteProperties);

    if (propsError) {
      console.error('Error adding properties:', propsError);
      throw new Error('Failed to add properties to invite');
    }

    const inviteUrl = `${req.headers.get('origin')}/invite/${token_hash}`;
    console.log('Invite created successfully, URL:', inviteUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inviteId: invite.id,
        inviteUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
