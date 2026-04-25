import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const SETUP_FEE_PRICE_ID   = process.env.STRIPE_SETUP_FEE_PRICE_ID!
export const MONTHLY_PRICE_ID     = process.env.STRIPE_MONTHLY_PRICE_ID!
export const WEBHOOK_SECRET       = process.env.STRIPE_WEBHOOK_SECRET!
