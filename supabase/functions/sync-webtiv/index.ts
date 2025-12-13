import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.4"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const clientGuid = Deno.env.get('WEBTIV_CLIENT_GUID')!
const agentsGuid = Deno.env.get('WEBTIV_AGENTS_GUID')!
const WEBTIV_XML_URL = `https://webtiv.co.il/xml.aspx?clientguid=${encodeURIComponent(clientGuid)}&agentsguid=${encodeURIComponent(agentsGuid)}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user has agent or admin role
    const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', { _role: 'agent' })
    const { data: isAdmin, error: adminError } = await supabaseClient.rpc('has_role', { _role: 'admin' })
    
    if (roleError || adminError || (!hasRole && !isAdmin)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Agent or Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('1. Fetching XML from Webtiv...')
    const xmlResponse = await fetch(WEBTIV_XML_URL)
    if (!xmlResponse.ok) {
      throw new Error(`XML fetch failed, status: ${xmlResponse.status}`)
    }

    console.log('2. Parsing XML...')
    const xmlText = await xmlResponse.text()
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" })
    const xmlData = parser.parse(xmlText)
    
    const properties = xmlData.NewDataSet?.Properties || []
    const pictures = xmlData.NewDataSet?.pictures || []
    const agents = xmlData.NewDataSet?.officeAgentsProfile || []

    console.log('Parsed XML data', { 
      propertyCount: properties.length, 
      pictureCount: pictures.length, 
      agentCount: agents.length 
    })

    // 3. Clear existing data
    console.log('3. Clearing existing properties...')
    const { error: deletePropertiesError } = await supabase
      .from('properties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (deletePropertiesError) {
      console.error('Error deleting properties:', deletePropertiesError)
    }

    // 4. Process and insert agents
    console.log('4. Processing agents...')
    let insertedAgents = 0
    for (const agent of agents) {
      const agentData = {
        email: agent.AgentEmail || `agent${agent.AgentSerial}@extra-mile.co.il`,
        full_name: agent.AgentName || 'סוכן',
        phone: agent.AgentMobilePhone || ''
      }

      // Check if agent already exists
      const { data: existingAgent } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', agentData.email)
        .maybeSingle()

      if (!existingAgent) {
        // Insert profile without role
        const { data: newProfile, error: agentError } = await supabase
          .from('profiles')
          .insert(agentData)
          .select('id')
          .single()
        
        if (!agentError && newProfile) {
          // Insert role in user_roles table
          await supabase
            .from('user_roles')
            .insert({ user_id: newProfile.id, role: 'agent' })
          insertedAgents++
        } else {
          console.error('Agent insert error:', agentError)
        }
      }
    }

    // 5. Process properties
    console.log('5. Processing properties...')
    const propertiesToInsert = []
    const propertiesWithImages = new Map()

    // Log first property structure to understand field names
    if (properties.length > 0) {
      console.log('Property fields available', { 
        fieldCount: Object.keys(properties[0]).length,
        hasSerial: !!properties[0].serial,
        hasCity: !!(properties[0].city || properties[0].City)
      })
    }

    for (const property of properties) {
      // Get pictures for this property
      const propertyPictures = pictures
        .filter((pic: any) => pic.picserial === property.serial)
        .sort((a: any, b: any) => parseInt(a.picOrder || '0') - parseInt(b.picOrder || '0'))

      // Skip properties without pictures
      if (!propertyPictures.length) {
        console.log(`Skipping property ${property.serial} - no pictures`)
        continue
      }

      // Robust field extraction per Webtiv XML (see logs: city, shcuna, street, number, room, builtsqmr, comments2, priceshekel)
      const street = property.street || property.Street || ''
      const number = property.number || property.Number || ''
      const address = `${street} ${number}`.trim()
      const city = property.city || property.City || 'לא צוין'
      const neighborhood = property.shcuna || property.neighborhood || ''
      const description = (property.comments2 || property.Remarks || '').toString().trim()
      const rooms = parseFloat(property.room || property.rooms || '0') || null
      const size_sqm = parseInt(property.builtsqmr || property.sqmr || property.SQMR || '0') || null
      const floor = parseInt(property.floor || property.Floor || '0') || null

      // Parse parking to a numeric approximation
      let parking_spots = 0
      const park = `${property.park || ''}`
      if (park.includes('כפולה') || park.includes('עוקבת')) parking_spots = 2
      else if (park.includes('יש')) parking_spots = 1

      const propertyData = {
        address: address || 'לא צוין',
        city,
        neighborhood: neighborhood || null,
        price: parseFloat(property.priceshekel || property.priceShekel || '0'),
        size_sqm,
        rooms,
        floor,
        description,
        status: 'available',
        has_safe_room: property.mamadYN === 'true' || property.mamadYN === true,
        has_sun_balcony: property.mirpesetShemeshYN === 'true' || property.mirpesetShemeshYN === true,
        parking_spots,
        created_by: null,
      }

      console.log(`Property ${property.serial}: ${address || '(no address)'}, rooms=${rooms ?? 'na'}, size=${size_sqm ?? 'na'}m², city=${city}, desc=${description.substring(0, 40)}`)

      propertiesToInsert.push(propertyData)
      propertiesWithImages.set(propertiesToInsert.length - 1, propertyPictures)
    }

    console.log(`6. Inserting ${propertiesToInsert.length} properties...`)
    const { data: insertedProperties, error: insertError } = await supabase
      .from('properties')
      .insert(propertiesToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting properties:', insertError)
      throw insertError
    }

    // 7. Insert property images
    console.log('7. Inserting property images...')
    let totalImages = 0
    for (let i = 0; i < insertedProperties.length; i++) {
      const property = insertedProperties[i]
      const pictures = propertiesWithImages.get(i)
      
      if (pictures && pictures.length > 0) {
        const imagesToInsert = pictures.map((pic: any, index: number) => ({
          property_id: property.id,
          url: pic.picurl,
          is_primary: index === 0
        }))

        const { error: imagesError } = await supabase
          .from('property_images')
          .insert(imagesToInsert)

        if (imagesError) {
          console.error(`Error inserting images for property ${property.id}:`, imagesError)
        } else {
          totalImages += imagesToInsert.length
        }
      }
    }

    const result = {
      success: true,
      inserted: insertedProperties.length,
      filtered: {
        'no-picture': properties.length - propertiesToInsert.length
      },
      insertedAgents: insertedAgents,
      totalImages: totalImages
    }

    console.log('Sync completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
