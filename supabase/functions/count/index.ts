import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('DB_SERVICE_ROLE_KEY')!
const OFFSET = 23

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://eirisleep.com',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { count, error } = await supabase
    .from('Subscribers')
    .select('id', { count: 'exact', head: true })

  if (error) {
    return new Response(JSON.stringify({ count: OFFSET }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(
    JSON.stringify({ count: (count ?? 0) + OFFSET }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
