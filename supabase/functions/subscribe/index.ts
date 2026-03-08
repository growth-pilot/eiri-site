import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('DB_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = 'https://eirisleep.com'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check if already verified
    const { data: existing } = await supabase
      .from('subscribers')
      .select('verified')
      .eq('email', email)
      .single()

    if (existing?.verified) {
      return new Response(JSON.stringify({ message: 'already_verified' }), { headers: corsHeaders })
    }

    // Generate token
    const token = crypto.randomUUID()

    // Upsert subscriber
    await supabase.from('subscribers').upsert({ email, token, verified: false }, { onConflict: 'email' })

    // Send verification email via Resend
    const verifyUrl = `${SITE_URL}/verify.html?token=${token}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EIRI <jacob@eirisleep.com>',
        to: email,
        subject: 'Confirm your spot on the EIRI early list',
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
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#E8EDF5;letter-spacing:-0.01em;">You're almost in.</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:16px;font-weight:300;color:rgba(232,237,245,0.65);line-height:1.6;text-align:center;">
            Just confirm your email to secure your spot<br/>on the EIRI early list.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <a href="${verifyUrl}" style="display:inline-block;background:rgba(232,237,245,0.08);color:#E8EDF5;text-decoration:none;font-size:15px;font-weight:500;padding:14px 32px;border-radius:12px;border:1px solid rgba(232,237,245,0.18);">
            Confirm my spot
          </a>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;font-size:12px;color:rgba(232,237,245,0.3);line-height:1.6;text-align:center;">
            If you didn't sign up for EIRI, you can safely ignore this email.<br/>
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

    if (!resendRes.ok) {
      const resendErr = await resendRes.json()
      return new Response(JSON.stringify({ error: 'email_failed', detail: resendErr }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ message: 'verification_sent' }), { headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})