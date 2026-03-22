import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SITE_URL = 'https://eirisleep.com'

const PRICES: Record<string, { amount: number; name: string }> = {
  starter:  { amount: 999,  name: 'EIRI Founders Club — Starter' },
  core:     { amount: 1999, name: 'EIRI Founders Club — Core' },
  founding: { amount: 3999, name: 'EIRI Founders Club — Founding Member' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { tier } = await req.json()
    const price = PRICES[tier]
    if (!price) {
      return new Response(JSON.stringify({ error: 'invalid_tier' }), { status: 400, headers: corsHeaders })
    }

    // Create Stripe checkout session via API
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][product_data][name]': price.name,
      'line_items[0][price_data][unit_amount]': String(price.amount),
      'line_items[0][quantity]': '1',
      mode: 'payment',
      success_url: `${SITE_URL}/verify?checkout=success`,
      cancel_url: `${SITE_URL}/#founders`,
    })

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await stripeRes.json()

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message ?? 'stripe_error' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
