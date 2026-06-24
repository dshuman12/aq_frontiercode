#!/usr/bin/env node
/**
 * Ensures Repflow subscription products/prices/payment links exist in Stripe (test or live,
 * depending on STRIPE_SECRET_KEY), then writes a managed block into .env.local.
 *
 * One-time: copy sk_* and pk_* from the same Stripe API keys page into .env.stripe.secrets
 * (see .env.stripe.secrets.example), then run: npm run stripe:sync
 *
 * @see ../../repflow/docs/QUICK-SETUP-GUIDE.md (from monorepo root)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const MARKER_START = '# --- Repflow Stripe (auto-managed) — do not edit by hand ---'
const MARKER_END = '# --- end Repflow Stripe auto-managed ---'

const TIERS = [
  {
    id: 'starter',
    name: 'Repflow | Starter',
    monthCents: 3900,
    yearCents: 39000,
  },
  {
    id: 'growth',
    name: 'Repflow | Growth',
    monthCents: 17900,
    yearCents: 179000,
  },
  {
    id: 'scale',
    name: 'Repflow | Scale',
    monthCents: 27900,
    yearCents: 279000,
  },
]

function parseEnvFile(filePath, { force } = {}) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (key && (force || process.env[key] === undefined)) process.env[key] = val
  }
}

/** Base env first; `.env.stripe.secrets` wins so real keys are not shadowed by stale .env.local. */
function loadSecrets() {
  parseEnvFile(path.join(ROOT, '.env.local'))
  parseEnvFile(path.join(ROOT, '.env.stripe.secrets'), { force: true })
}

const PLACEHOLDER_HINT =
  'Replace placeholder text with the real Secret key and Publishable key from the same Stripe page (Developers → API keys). Test: https://dashboard.stripe.com/test/apikeys'

function looksLikeStripePlaceholderSecret(sk) {
  const lower = sk.toLowerCase()
  if (lower.includes('your_') || lower.includes('paste') || lower.includes('changeme'))
    return true
  if (/_here$/.test(lower)) return true
  // Real Stripe secret keys are long; example placeholders are short.
  if (sk.startsWith('sk_') && sk.length < 60) return true
  return false
}

function looksLikeStripePlaceholderPublishable(pk) {
  const lower = pk.toLowerCase()
  if (lower.includes('your_') || lower.includes('paste') || lower.includes('changeme'))
    return true
  if (/_here$/.test(lower)) return true
  if (pk.startsWith('pk_') && pk.length < 60) return true
  return false
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mergeEnvFile(newBlockLines, envPath) {
  const blockBody = [...newBlockLines].join('\n') + '\n'
  const block = `${MARKER_START}\n${blockBody}${MARKER_END}\n`
  let body = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  const re = new RegExp(
    `${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}\\n?`,
    'm'
  )
  if (re.test(body)) body = body.replace(re, block)
  else body = `${body.trimEnd()}\n\n${block}`
  fs.writeFileSync(envPath, body.endsWith('\n') ? body : `${body}\n`, 'utf8')
}

function resolveOutEnvPath() {
  const i = process.argv.indexOf('--out')
  if (i !== -1 && process.argv[i + 1]) {
    const p = process.argv[i + 1]
    return path.isAbsolute(p) ? p : path.join(ROOT, p)
  }
  return path.join(ROOT, '.env.local')
}

/** `npm run stripe:sync:dev` writes here — must use Stripe test keys only. */
function isDevelopmentLocalOutPath(outEnvPath) {
  return path.basename(outEnvPath) === '.env.development.local'
}

async function findOrCreateProduct(stripe, tier) {
  const list = await stripe.products.list({ limit: 100, active: true })
  const byMeta = list.data.find(
    (p) => p.metadata?.repflow_tier === tier.id && p.metadata?.repflow_sync === '1'
  )
  if (byMeta) return byMeta
  const byName = list.data.find((p) => p.name === tier.name)
  if (byName) {
    await stripe.products.update(byName.id, {
      metadata: { repflow_tier: tier.id, repflow_sync: '1' },
    })
    return byName
  }
  return stripe.products.create({
    name: tier.name,
    metadata: { repflow_tier: tier.id, repflow_sync: '1' },
  })
}

async function findOrCreatePrice(stripe, productId, interval, unitAmount) {
  const prices = await stripe.prices.list({ product: productId, limit: 100 })
  const found = prices.data.find(
    (p) =>
      p.active &&
      p.recurring?.interval === interval &&
      p.unit_amount === unitAmount &&
      p.currency === 'usd'
  )
  if (found) return found
  return stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval },
  })
}

/**
 * After checkout, Stripe redirects here so the app can run signup completion (localStorage).
 * Override with REPFLOW_STRIPE_PAYMENT_RETURN_BASE in .env.local (e.g. production site origin).
 */
function getPaymentReturnUrl() {
  // Prefer explicit override, then public app URL, then NEXTAUTH_URL (often set for prod in .env.local).
  const base =
    process.env.REPFLOW_STRIPE_PAYMENT_RETURN_BASE?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/auth/signup?stripe_payment=success`
}

async function findOrCreatePaymentLink(stripe, priceId) {
  const returnUrl = getPaymentReturnUrl()
  const afterCompletion = {
    type: 'redirect',
    redirect: { url: returnUrl },
  }
  const links = await stripe.paymentLinks.list({ limit: 100, active: true })
  const found = links.data.find(
    (pl) => pl.metadata?.repflow_price_id === priceId
  )
  if (found) {
    try {
      return await stripe.paymentLinks.update(found.id, {
        after_completion: afterCompletion,
      })
    } catch (e) {
      console.error(
        'Could not update Payment Link redirect URL; fix in Stripe Dashboard or set REPFLOW_STRIPE_PAYMENT_RETURN_BASE in .env.local:',
        e?.message || e
      )
      return found
    }
  }
  return stripe.paymentLinks.create({
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { repflow_price_id: priceId, repflow_sync: '1' },
    after_completion: afterCompletion,
  })
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const outEnvPath = resolveOutEnvPath()

  loadSecrets()

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()

  if (!secretKey || !secretKey.startsWith('sk_')) {
    console.error(
      'Missing STRIPE_SECRET_KEY. Add it to .env.stripe.secrets (see .env.stripe.secrets.example) or export it, then re-run.'
    )
    process.exit(1)
  }

  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    console.error(
      'Missing publishable key. Set STRIPE_PUBLISHABLE_KEY in .env.stripe.secrets (same page as your secret key in Stripe Dashboard).'
    )
    process.exit(1)
  }

  if (looksLikeStripePlaceholderSecret(secretKey)) {
    console.error(
      'STRIPE_SECRET_KEY looks like a placeholder or is too short.\n' + PLACEHOLDER_HINT
    )
    process.exit(1)
  }
  if (looksLikeStripePlaceholderPublishable(publishableKey)) {
    console.error(
      'Publishable key looks like a placeholder or is too short.\n' + PLACEHOLDER_HINT
    )
    process.exit(1)
  }

  if (isDevelopmentLocalOutPath(outEnvPath)) {
    if (!secretKey.startsWith('sk_test_') || !publishableKey.startsWith('pk_test_')) {
      console.error(
        'stripe:sync:dev targets .env.development.local for local `next dev` (Stripe test mode only).\n' +
          'Your .env.stripe.secrets must use TEST keys from the same Dashboard page:\n' +
          '  https://dashboard.stripe.com/test/apikeys\n' +
          'Use sk_test_... and pk_test_... (not sk_live_ / pk_live_). Then run: npm run stripe:sync:dev\n' +
          'Tip: keep live keys for production sync: npm run stripe:sync (writes .env.local).'
      )
      process.exit(1)
    }
  }

  const isTest = secretKey.startsWith('sk_test_')
  const stripe = new Stripe(secretKey)

  const resolved = {}
  for (const tier of TIERS) {
    const product = await findOrCreateProduct(stripe, tier)
    const priceMonth = await findOrCreatePrice(
      stripe,
      product.id,
      'month',
      tier.monthCents
    )
    const priceYear = await findOrCreatePrice(
      stripe,
      product.id,
      'year',
      tier.yearCents
    )
    const linkMonth = await findOrCreatePaymentLink(stripe, priceMonth.id)
    const linkYear = await findOrCreatePaymentLink(stripe, priceYear.id)
    resolved[tier.id] = {
      monthPrice: priceMonth.id,
      yearPrice: priceYear.id,
      monthUrl: linkMonth.url,
      yearUrl: linkYear.url,
    }
    console.error(
      `${tier.id}: ${priceMonth.id} / ${priceYear.id} → links OK`
    )
  }

  const testModeLine = isTest
    ? 'NEXT_PUBLIC_STRIPE_TEST_MODE=true'
    : '# NEXT_PUBLIC_STRIPE_TEST_MODE=   (omit or false for production)'

  const lines = [
    testModeLine,
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publishableKey}`,
    `STRIPE_SECRET_KEY=${secretKey}`,
    `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=${resolved.starter.monthPrice}`,
    `NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=${resolved.growth.monthPrice}`,
    `NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=${resolved.scale.monthPrice}`,
    `NEXT_PUBLIC_STRIPE_STARTER_PAYMENT_LINK=${resolved.starter.monthUrl}`,
    `NEXT_PUBLIC_STRIPE_GROWTH_PAYMENT_LINK=${resolved.growth.monthUrl}`,
    `NEXT_PUBLIC_STRIPE_SCALE_PAYMENT_LINK=${resolved.scale.monthUrl}`,
    `NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PAYMENT_LINK=${resolved.starter.yearUrl}`,
    `NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PAYMENT_LINK=${resolved.growth.yearUrl}`,
    `NEXT_PUBLIC_STRIPE_SCALE_YEARLY_PAYMENT_LINK=${resolved.scale.yearUrl}`,
  ]

  if (dryRun) {
    console.log(MARKER_START)
    console.log(lines.join('\n'))
    console.log(MARKER_END)
    return
  }

  mergeEnvFile(lines, outEnvPath)
  console.error(`Wrote managed Stripe block to ${outEnvPath}`)
}

main().catch((e) => {
  if (e?.type === 'StripeAuthenticationError' || e?.code === 'api_key_invalid') {
    console.error(
      'Stripe rejected the secret key (401). Copy the full Secret key from Dashboard → API keys (test and live are different).\n' +
        PLACEHOLDER_HINT +
        '\nIf you use .env.stripe.secrets, it overrides STRIPE_* from .env.local for this script.'
    )
  } else {
    console.error(e)
  }
  process.exit(1)
})
