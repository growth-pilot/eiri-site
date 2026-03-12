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
    if (!email) return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders })

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders })
    }

    // MX record check — ensures the domain can actually receive mail
    const domain = email.split('@')[1]
    try {
      const mx = await Deno.resolveDns(domain, 'MX')
      if (!mx || mx.length === 0) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders })
      }
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('Subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ message: 'already_subscribed' }), { headers: corsHeaders })
    }

    // Insert as verified immediately (no verification step)
    const { error: insertError } = await supabase
      .from('Subscribers')
      .insert({ email, token: crypto.randomUUID(), verified: true })

    if (insertError) {
      return new Response(JSON.stringify({ error: 'insert_failed', detail: insertError.message }), { status: 500, headers: corsHeaders })
    }

    // Get signup number (all subscribers, matches site counter)
    const { count } = await supabase
      .from('Subscribers')
      .select('id', { count: 'exact', head: true })
    const signupNumber = (count ?? 1) + 23

    // Send welcome email immediately
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EIRI <jacob@eirisleep.com>',
        to: email,
        subject: "You're on the EIRI early list",
        html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
</head>
<body bgcolor="#0B0F1A" style="margin:0;padding:0;background:#0B0F1A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0B0F1A" style="background:#0B0F1A;padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" bgcolor="#121826" style="background:#121826;border-radius:18px;border:1px solid rgba(232,237,245,0.1);padding:48px 40px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="${SITE_URL}/images/EIRIWHITELOGOBIG.png" alt="EIRI" width="100" style="opacity:0.9;"/>
        </td></tr>
        <tr><td align="center" style="padding-bottom:8px;">
          <p style="margin:0;font-size:13px;font-weight:400;color:rgba(232,237,245,0.4);letter-spacing:0.5px;text-transform:uppercase;">Sign up #${signupNumber}</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#E8EDF5;letter-spacing:-0.01em;">Welcome to the early list.</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:16px;font-weight:300;color:rgba(232,237,245,0.65);line-height:1.6;text-align:center;">
            You are sign up number ${signupNumber}.<br/>We'll give you weekly updates on the progress of our first prototype and a discounted order when our first products release.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="https://youtu.be/qjDRAuKlHNY" style="color:#E8EDF5;text-decoration:none;border-bottom:1px solid rgba(232,237,245,0.3);font-size:15px;font-weight:400;">Watch welcome video at this link</a>
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

    if (!resendRes.ok) {
      const resendErr = await resendRes.json()
      return new Response(JSON.stringify({ error: 'email_failed', detail: resendErr }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ message: 'subscribed' }), { headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
