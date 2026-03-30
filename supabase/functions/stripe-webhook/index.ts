import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=')))
  const timestamp = parts['t']
  const sig = parts['v1']
  const payload = `${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('')
  return expected === sig
}

serve(async (req) => {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(body)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const email = session.customer_details?.email
    const name = session.customer_details?.name?.split(' ')[0] || 'there'
    const shipping = session.shipping_details?.address
    const tier = session.metadata?.tier || 'founding'
    const currency = session.currency?.toUpperCase() || 'USD'
    const amount = (session.amount_total / 100).toFixed(2)

    const shippingLine = shipping
      ? `${shipping.line1}${shipping.line2 ? ', ' + shipping.line2 : ''}, ${shipping.city}, ${shipping.postal_code}, ${shipping.country}`
      : 'Not provided'

    // Customise email content per tier
    const isReserve = tier === 'reserve15' || tier === 'reserve20'
    const discountPct = tier === 'reserve15' ? '15%' : tier === 'reserve20' ? '20%' : null

    const subject = isReserve
      ? `Your EIRI spot is reserved — ${discountPct} off locked in ✅`
      : 'Your EIRI pre-order is confirmed 🎉'

    const heroText = isReserve
      ? `You've locked in ${discountPct} off EIRI. When the product launches, we'll send a discount code straight to this email — just use it at checkout to claim your saving.`
      : `Your EIRI pre-order is confirmed. We're working hard to get it to you and will keep you updated every step of the way.`

    const orderLabel = isReserve
      ? `EIRI Reserve — ${discountPct} Off`
      : 'EIRI Pre-order'

    const nextStepTitle = isReserve ? 'How it works' : "What's next"
    const nextStepText = isReserve
      ? `When EIRI is ready to launch, we'll email your unique <strong style="color: #E8EDF5;">${discountPct} discount code</strong>. Apply it at checkout to get ${discountPct} off the full price. Your reservation fee is fully refundable within 30 days.`
      : `We're targeting a <strong style="color: #E8EDF5;">June 2026</strong> ship date for first-batch pre-orders. As we get closer, you'll be the first to know — including tracking info once your EIRI is on its way.`

    if (email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'EIRI <jacob@eirisleep.com>',
          to: email,
          subject,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0B0F1A; color: #E8EDF5; padding: 48px 32px; border-radius: 12px;">
              <img src="https://eirisleep.com/images/EIRIWHITELOGOBIG.png" alt="EIRI" style="width: 60px; margin-bottom: 32px; display: block;" />
              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px; color: #ffffff;">Thank you, ${name}.</h1>
              <p style="font-size: 16px; color: rgba(232,237,245,0.7); margin: 0 0 32px; line-height: 1.6;">${heroText}</p>

              <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: rgba(232,237,245,0.4); text-transform: uppercase; letter-spacing: 0.08em;">Order Summary</p>
                <p style="margin: 0 0 4px; font-size: 15px; color: #E8EDF5;">${orderLabel} &nbsp;·&nbsp; ${currency} ${amount}</p>
                ${!isReserve ? `<p style="margin: 8px 0 0; font-size: 13px; color: rgba(232,237,245,0.5);">Shipping to: ${shippingLine}</p>` : ''}
              </div>

              <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px 24px; margin-bottom: 32px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: rgba(232,237,245,0.4); text-transform: uppercase; letter-spacing: 0.08em;">${nextStepTitle}</p>
                <p style="margin: 0; font-size: 15px; color: rgba(232,237,245,0.7); line-height: 1.6;">${nextStepText}</p>
              </div>

              <p style="font-size: 14px; color: rgba(232,237,245,0.5); line-height: 1.6; margin: 0 0 8px;">Questions? Reply to this email or reach us at <a href="mailto:thoughts@eirisleep.com" style="color: #C9A84C; text-decoration: none;">thoughts@eirisleep.com</a></p>
              <p style="font-size: 14px; color: rgba(232,237,245,0.5); margin: 0;">— Jacob, EIRI</p>
            </div>
          `,
        }),
      })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
