import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const PropertyDataSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  price: z.number().positive().optional(),
  city: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  rooms: z.number().positive().optional(),
  floor: z.number().optional(),
  size_sqm: z.number().positive().optional(),
  description: z.string().max(2000).optional(),
  agent_name: z.string().max(100).optional(),
});

const ClientDataSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().max(50).optional(),
  full_name: z.string().max(100).optional(),
  name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  remark: z.string().max(1000).optional(),
  agent_name: z.string().max(100).optional(),
});

const RequestSchema = z.object({
  propertyData: PropertyDataSchema.optional(),
  clientData: ClientDataSchema.optional(),
  type: z.enum(['property', 'client']),
});

interface WebtivLidData {
  client: string;
  provider: string;
  category: string;
  name: string;
  phone: string;
  email?: string;
  price?: string;
  city?: string;
  neighborhood?: string;
  propertyType?: string;
  rooms?: string;
  floor?: string;
  builtsqmr?: string;
  remark?: string;
  agent?: string;
  publishID?: string;
  cardID?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has agent or admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['agent', 'admin']);

    if (roleError || !roles || roles.length === 0) {
      console.error('Role check failed', { userId: user.id, roleError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized - agent or admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input data
    const rawData = await req.json();
    const validated = RequestSchema.parse(rawData);
    const { propertyData, clientData, type } = validated;
    console.log('Request received', { 
      type, 
      hasProperty: !!propertyData,
      hasClient: !!clientData,
      propertyId: propertyData?.id,
      clientId: clientData?.id
    });

    // Webtiv client ID
    const WEBTIV_CLIENT_ID = "5e62cd77-96eb-45e9-ba08-3aeeb911e90c";
    const WEBTIV_PROVIDER = "EXTRAMILE המערכת";

    let webtivData: WebtivLidData;

    if (type === 'property') {
      if (!propertyData) {
        throw new Error('Property data is required when type is "property"');
      }
      // Send property data to Webtiv
      webtivData = {
        client: WEBTIV_CLIENT_ID,
        provider: WEBTIV_PROVIDER,
        category: propertyData.status === 'available' ? 'מסחרי היצע' : 'מסחרי היצע',
        name: propertyData.address || 'נכס',
        phone: propertyData.phone || '',
        email: propertyData.email || '',
        price: propertyData.price?.toString() || '',
        city: propertyData.city || '',
        neighborhood: propertyData.neighborhood || '',
        propertyType: 'דירה',
        rooms: propertyData.rooms?.toString() || '',
        floor: propertyData.floor?.toString() || '',
        builtsqmr: propertyData.size_sqm?.toString() || '',
        remark: propertyData.description || '',
        agent: propertyData.agent_name || '',
        publishID: propertyData.id || '',
        cardID: propertyData.id || '',
      };
    } else if (type === 'client') {
      if (!clientData) {
        throw new Error('Client data is required when type is "client"');
      }
      // Send client data to Webtiv
      webtivData = {
        client: WEBTIV_CLIENT_ID,
        provider: WEBTIV_PROVIDER,
        category: clientData.category || 'קונה',
        name: clientData.full_name || clientData.name || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        remark: clientData.remark || '',
        agent: clientData.agent_name || '',
      };
    } else {
      throw new Error('Invalid type. Must be "property" or "client"');
    }

    console.log('Sending to Webtiv', { 
      category: webtivData.category,
      hasName: !!webtivData.name,
      hasPhone: !!webtivData.phone,
      recordId: webtivData.publishID || webtivData.cardID
    });

    // Send to Webtiv API
    const response = await fetch('https://webtivapi.webtiv.co.il/api/WebtivLid/WebtivLidPost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webtivData),
    });

    const responseText = await response.text();
    console.log('Webtiv API response', { 
      status: response.status,
      success: response.ok,
      bodyLength: responseText.length
    });

    if (!response.ok) {
      throw new Error(`Webtiv API error: ${response.status} - ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { message: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'נשלח בהצלחה ל-Webtiv',
        webtivResponse: responseData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-to-webtiv function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
