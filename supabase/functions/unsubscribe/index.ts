import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('DB_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://eirisleep.com'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response(JSON.stringify({ error: 'no_token' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { error } = await supabase
    .from('Subscribers')
    .delete()
    .eq('token', token)

  if (error) {
    return new Response(JSON.stringify({ error: 'failed', detail: error.message }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ message: 'unsubscribed' }), { headers: corsHeaders })
})
