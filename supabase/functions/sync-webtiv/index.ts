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

    // Check if user has agent or admin role by querying user_roles directly
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['agent', 'admin'])
    
    if (roleError || !userRoles || userRoles.length === 0) {
      console.log('Role check failed:', { userId: user.id, roleError, userRoles })
      return new Response(JSON.stringify({ error: 'Forbidden: Agent or Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('User authorized with roles:', userRoles.map(r => r.role))

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

    // 3. Process and insert agents (unchanged)
    console.log('3. Processing agents...')
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

    // 4. Fetch existing properties to enable upsert logic
    console.log('4. Fetching existing properties for upsert comparison...')
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id, address, city')
    
    // Create a lookup map by address+city (composite key for matching)
    const existingMap = new Map<string, string>()
    for (const p of (existingProperties || [])) {
      const key = `${p.address}|${p.city}`.toLowerCase().trim()
      existingMap.set(key, p.id)
    }
    console.log(`Found ${existingMap.size} existing properties`)

    // 5. Process properties with upsert logic
    console.log('5. Processing properties...')
    const propertiesToUpsert = []
    const propertiesWithImages = new Map()
    let updatedCount = 0
    let insertedCount = 0

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

      // Robust field extraction per Webtiv XML
      const street = property.street || property.Street || ''
      const number = property.number || property.Number || ''
      const address = `${street} ${number}`.trim() || 'לא צוין'
      const city = property.city || property.City || 'לא צוין'
      const neighborhood = property.shcuna || property.neighborhood || ''
      const description = (property.comments2 || property.Remarks || '').toString().trim()
      const rooms = parseFloat(property.room || property.rooms || '0') || null
      const size_sqm = parseInt(property.builtsqmr || property.sqmr || property.SQMR || '0') || null
      
      // Only extract floor from Webtiv if it exists (don't overwrite manual data)
      const webtivFloor = property.floor || property.Floor
      const floor = webtivFloor ? parseInt(webtivFloor) : null

      // Parse parking to a numeric approximation
      let parking_spots = 0
      const park = `${property.park || ''}`
      if (park.includes('כפולה') || park.includes('עוקבת')) parking_spots = 2
      else if (park.includes('יש')) parking_spots = 1

      const lookupKey = `${address}|${city}`.toLowerCase().trim()
      const existingId = existingMap.get(lookupKey)

      // Build the property data - only include fields that come from Webtiv
      // IMPORTANT: We do NOT include enrichment fields (renovation_status, air_directions, total_floors, build_year)
      // to protect manual data
      const propertyData: any = {
        address,
        city,
        neighborhood: neighborhood || null,
        price: parseFloat(property.priceshekel || property.priceShekel || '0'),
        size_sqm,
        rooms,
        description,
        status: 'available',
        has_safe_room: property.mamadYN === 'true' || property.mamadYN === true,
        has_sun_balcony: property.mirpesetShemeshYN === 'true' || property.mirpesetShemeshYN === true,
        parking_spots,
      }

      // Only set floor if Webtiv provides it - otherwise leave existing value
      if (floor !== null) {
        propertyData.floor = floor
      }

      if (existingId) {
        // Update existing property - preserve ID and don't touch enrichment fields
        propertyData.id = existingId
        updatedCount++
      } else {
        // New property
        propertyData.created_by = null
        insertedCount++
      }

      console.log(`Property ${property.serial}: ${address}, rooms=${rooms ?? 'na'}, size=${size_sqm ?? 'na'}m², city=${city}, existing=${!!existingId}`)

      propertiesToUpsert.push(propertyData)
      propertiesWithImages.set(propertiesToUpsert.length - 1, propertyPictures)
    }

    // 6. Upsert properties (preserving IDs and enrichment data)
    console.log(`6. Upserting ${propertiesToUpsert.length} properties (${insertedCount} new, ${updatedCount} updates)...`)
    const { data: upsertedProperties, error: upsertError } = await supabase
      .from('properties')
      .upsert(propertiesToUpsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()

    if (upsertError) {
      console.error('Error upserting properties:', upsertError)
      throw upsertError
    }

    // 7. Handle property images
    // For existing properties, we need to be careful not to duplicate images
    console.log('7. Processing property images...')
    let totalImages = 0
    
    for (let i = 0; i < upsertedProperties.length; i++) {
      const property = upsertedProperties[i]
      const newPictures = propertiesWithImages.get(i)
      
      if (newPictures && newPictures.length > 0) {
        // Check if this property already has images
        const { data: existingImages } = await supabase
          .from('property_images')
          .select('url')
          .eq('property_id', property.id)
        
        const existingUrls = new Set((existingImages || []).map(img => img.url))
        
        // Only insert images that don't already exist
        const newImagesToInsert = newPictures
          .filter((pic: any) => !existingUrls.has(pic.picurl))
          .map((pic: any, index: number) => ({
            property_id: property.id,
            url: pic.picurl,
            is_primary: existingUrls.size === 0 && index === 0 // Only set primary if no existing images
          }))

        if (newImagesToInsert.length > 0) {
          const { error: imagesError } = await supabase
            .from('property_images')
            .insert(newImagesToInsert)

          if (imagesError) {
            console.error(`Error inserting images for property ${property.id}:`, imagesError)
          } else {
            totalImages += newImagesToInsert.length
          }
        }
      }
    }

    const result = {
      success: true,
      total: upsertedProperties.length,
      inserted: insertedCount,
      updated: updatedCount,
      filtered: {
        'no-picture': properties.length - propertiesToUpsert.length
      },
      insertedAgents: insertedAgents,
      totalImages: totalImages,
      message: `Synced ${upsertedProperties.length} properties (${insertedCount} new, ${updatedCount} updated). Manual enrichment data preserved.`
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