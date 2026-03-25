import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SITE_URL = 'https://eirisleep.com'

const PRICES: Record<string, { amount: number; name: string }> = {
  founding: { amount: 3999, name: 'EIRI Pre Order ($39.99)' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type',
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
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': price.name,
      'line_items[0][price_data][unit_amount]': String(price.amount),
      'line_items[0][quantity]': '1',
      mode: 'payment',
      'shipping_address_collection[allowed_countries][0]': 'US',
      'shipping_address_collection[allowed_countries][1]': 'GB',
      'shipping_address_collection[allowed_countries][2]': 'CA',
      'shipping_address_collection[allowed_countries][3]': 'AU',
      'shipping_address_collection[allowed_countries][4]': 'NZ',
      'shipping_address_collection[allowed_countries][5]': 'IE',
      'shipping_address_collection[allowed_countries][6]': 'DE',
      'shipping_address_collection[allowed_countries][7]': 'FR',
      'shipping_address_collection[allowed_countries][8]': 'NL',
      'shipping_address_collection[allowed_countries][9]': 'SE',
      'shipping_address_collection[allowed_countries][10]': 'NO',
      'shipping_address_collection[allowed_countries][11]': 'DK',
      'shipping_address_collection[allowed_countries][12]': 'ES',
      'shipping_address_collection[allowed_countries][13]': 'IT',
      'shipping_address_collection[allowed_countries][14]': 'PT',
      'shipping_address_collection[allowed_countries][15]': 'BE',
      'shipping_address_collection[allowed_countries][16]': 'AT',
      'shipping_address_collection[allowed_countries][17]': 'CH',
      'shipping_address_collection[allowed_countries][18]': 'PL',
      'shipping_address_collection[allowed_countries][19]': 'SG',
      'shipping_address_collection[allowed_countries][20]': 'JP',
      'shipping_address_collection[allowed_countries][21]': 'AE',
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
