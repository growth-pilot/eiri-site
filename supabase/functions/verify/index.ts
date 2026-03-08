import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('DB_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://eirisleep.com',
    'Access-Control-Allow-Headers': 'content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 400, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data, error } = await supabase
    .from('subscribers')
    .update({ verified: true })
    .eq('token', token)
    .select()
    .single()

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ message: 'verified' }), { headers: corsHeaders })
})