import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const SITE_URL = 'https://eirisleep.com'

type TierCurrency = { amount: number; name: string }
type PriceTable = Record<string, Record<string, TierCurrency>>

const PRICES: PriceTable = {
  founding: {
    usd: { amount: 4299, name: 'EIRI Pre-order' },
    gbp: { amount: 3399, name: 'EIRI Pre-order' },
    eur: { amount: 3999, name: 'EIRI Pre-order' },
    aud: { amount: 6599, name: 'EIRI Pre-order' },
    cad: { amount: 5899, name: 'EIRI Pre-order' },
    nzd: { amount: 7299, name: 'EIRI Pre-order' },
    sgd: { amount: 5799, name: 'EIRI Pre-order' },
    aed: { amount: 15799, name: 'EIRI Pre-order' },
    chf: { amount: 3899, name: 'EIRI Pre-order' },
    nok: { amount: 45900, name: 'EIRI Pre-order' },
    sek: { amount: 45900, name: 'EIRI Pre-order' },
    dkk: { amount: 29900, name: 'EIRI Pre-order' },
    pln: { amount: 17999, name: 'EIRI Pre-order' },
  },
  reserve15: {
    usd: { amount: 499, name: 'EIRI Reserve — 15% Off' },
    gbp: { amount: 399, name: 'EIRI Reserve — 15% Off' },
    eur: { amount: 449, name: 'EIRI Reserve — 15% Off' },
    aud: { amount: 799, name: 'EIRI Reserve — 15% Off' },
    cad: { amount: 699, name: 'EIRI Reserve — 15% Off' },
    nzd: { amount: 899, name: 'EIRI Reserve — 15% Off' },
    sgd: { amount: 699, name: 'EIRI Reserve — 15% Off' },
    aed: { amount: 1899, name: 'EIRI Reserve — 15% Off' },
    chf: { amount: 449, name: 'EIRI Reserve — 15% Off' },
    nok: { amount: 5500, name: 'EIRI Reserve — 15% Off' },
    sek: { amount: 5500, name: 'EIRI Reserve — 15% Off' },
    dkk: { amount: 3500, name: 'EIRI Reserve — 15% Off' },
    pln: { amount: 2199, name: 'EIRI Reserve — 15% Off' },
  },
  reserve20: {
    usd: { amount: 1299, name: 'EIRI Reserve — 20% Off' },
    gbp: { amount: 999, name: 'EIRI Reserve — 20% Off' },
    eur: { amount: 1199, name: 'EIRI Reserve — 20% Off' },
    aud: { amount: 1999, name: 'EIRI Reserve — 20% Off' },
    cad: { amount: 1799, name: 'EIRI Reserve — 20% Off' },
    nzd: { amount: 2199, name: 'EIRI Reserve — 20% Off' },
    sgd: { amount: 1799, name: 'EIRI Reserve — 20% Off' },
    aed: { amount: 4799, name: 'EIRI Reserve — 20% Off' },
    chf: { amount: 1199, name: 'EIRI Reserve — 20% Off' },
    nok: { amount: 13900, name: 'EIRI Reserve — 20% Off' },
    sek: { amount: 13900, name: 'EIRI Reserve — 20% Off' },
    dkk: { amount: 8900, name: 'EIRI Reserve — 20% Off' },
    pln: { amount: 5499, name: 'EIRI Reserve — 20% Off' },
  },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { tier, currency: rawCurrency } = await req.json()
    const currency = (rawCurrency || 'usd').toLowerCase()
    const tierPrices = PRICES[tier]
    if (!tierPrices) {
      return new Response(JSON.stringify({ error: 'invalid_tier' }), { status: 400, headers: corsHeaders })
    }
    const price = tierPrices[currency] ?? tierPrices['usd']

    // Create Stripe checkout session via API
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': currency,
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
