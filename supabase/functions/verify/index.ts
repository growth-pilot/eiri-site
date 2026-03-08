import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('DB_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = 'https://eirisleep.com'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 400, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data, error } = await supabase
    .from('Subscribers')
    .update({ verified: true })
    .eq('token', token)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: 'db_error', detail: error.message }), { status: 500, headers: corsHeaders })
  }
  if (!data) {
    return new Response(JSON.stringify({ error: 'token_not_found' }), { status: 400, headers: corsHeaders })
  }

  // Send thank-you email
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EIRI <jacob@eirisleep.com>',
      to: data.email,
      subject: "You're on the EIRI early list",
      html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#121826;border-radius:18px;border:1px solid rgba(232,237,245,0.1);padding:48px 40px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="${SITE_URL}/images/EIRIWHITELOGOBIG.png" alt="EIRI" width="100" style="opacity:0.9;"/>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#E8EDF5;letter-spacing:-0.01em;">You're in.</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:16px;font-weight:300;color:rgba(232,237,245,0.65);line-height:1.6;text-align:center;">
            Your spot on the EIRI early list is confirmed.<br/>You'll hear from us first when pre-orders open.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:15px;font-weight:300;color:rgba(232,237,245,0.5);line-height:1.6;text-align:center;">
            In the meantime, if you have any questions,<br/>feedback, or criticisms — I'd love to hear them.<br/><br/>
            <a href="mailto:thoughts@eirisleep.com" style="color:#E8EDF5;text-decoration:none;border-bottom:1px solid rgba(232,237,245,0.3);">thoughts@eirisleep.com</a>
          </p>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;font-size:12px;color:rgba(232,237,245,0.3);line-height:1.6;text-align:center;">
            Master your morning the night before.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    })
  })

  return new Response(JSON.stringify({ message: 'verified' }), { headers: corsHeaders })
})
