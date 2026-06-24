#!/usr/bin/env node
/**
 * Renders App Runner `apprunner.yaml` for **repflow-frontend** (prod) or **repflow-frontend-dev** (dev).
 *
 * Cognito / Secrets alignment:
 * - **Prod** (`repflow-frontend`, main): pool `us-east-2_UOedUZggp`, Secrets Manager `prod/Repflow` (ARN suffix `prod/Repflow-TiY3uS`).
 * - **Dev** (`repflow-frontend-dev`, dev branch): pool `us-east-2_s82ysRbW8`, Secrets Manager `dev/Repflow-stack` (ARN suffix `dev/Repflow-stack-CsBJxj`).
 *
 * Why: Repository-sourced App Runner reads env from this file; the console often hides edits.
 * **Never** run `--stack dev --write` on `main` — it overwrites production `apprunner.yaml` with the dev stack.
 *
 * Usage:
 *   npm run stripe:sync:dev && npm run apprunner:write-dev -- --stack dev
 *   npm run stripe:sync && npm run apprunner:write-prod -- --stack prod
 *
 * Options:
 *   --stack dev|prod   Default: dev for apprunner:*-dev scripts, set prod explicitly for production.
 *   --write            Write ./apprunner.yaml
 *   --env-file PATH    Dev default: .env.development.local; prod default: .env.local
 *
 * @see https://docs.aws.amazon.com/apprunner/latest/dg/config-file-ref.html
 * @see repflow/docs/DEPLOYMENT-ENVIRONMENTS.md
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const ACCOUNT = '401311973926'
const REGION = 'us-east-2'
const SM = `arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret`

/** Same keys as App Runner run.secrets for the Next.js app */
const SECRET_KEYS = [
  'NEXTAUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'AWS_COGNITO_CLIENT_ID',
  'AWS_COGNITO_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'DEMO_EMAIL_AGENT_PASSWORD',
  'API_AUTH_TOKEN',
  'API_BASE_URL',
]

/** Prod: User pool xxkvla — repflow-frontend */
const PROD = {
  AWS_COGNITO_USER_POOL_ID: 'us-east-2_UOedUZggp',
  NEXTAUTH_URL: 'https://cnhp2ujpjm.us-east-2.awsapprunner.com',
  NEXT_PUBLIC_API_BASE_URL: 'https://qppc8ivf44.us-east-2.awsapprunner.com',
  /** Secrets Manager bundle name in ARN path (random suffix from AWS) */
  secretBundle: 'prod/Repflow-TiY3uS',
}

/** Dev: Dev Pool — repflow-frontend-dev */
const DEV = {
  AWS_COGNITO_USER_POOL_ID: 'us-east-2_s82ysRbW8',
  NEXTAUTH_URL: 'https://pjarnibjib.us-east-2.awsapprunner.com',
  NEXT_PUBLIC_API_BASE_URL: 'https://i2mk8mby5p.us-east-2.awsapprunner.com',
  secretBundle: 'dev/Repflow-stack-CsBJxj',
}

function runSecretsYaml(secretBundle) {
  const lines = ['  secrets:']
  for (const k of SECRET_KEYS) {
    lines.push(`    - name: ${k}`)
    lines.push(`      value-from: "${SM}:${secretBundle}:${k}::"`)
  }
  return lines.join('\n')
}

function parseArgs(argv) {
  let write = false
  let stack = 'dev'
  let envFile = null
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--write') write = true
    else if (argv[i] === '--dev') stack = 'dev'
    else if (argv[i] === '--prod') stack = 'prod'
    else if (argv[i] === '--stack' && argv[i + 1]) {
      const v = argv[++i]
      if (v !== 'dev' && v !== 'prod') {
        console.error('--stack must be dev or prod')
        process.exit(1)
      }
      stack = v
    } else if (argv[i] === '--env-file' && argv[i + 1]) {
      envFile = path.resolve(argv[++i])
    }
  }
  if (!envFile) {
    envFile =
      stack === 'dev'
        ? path.join(ROOT, '.env.development.local')
        : path.join(ROOT, '.env.local')
  }
  return { write, stack, envFile }
}

function parseDotenv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

function yamlEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function sortPublicKeys(keys) {
  const set = new Set(keys)
  const ordered = []
  if (set.has('NEXT_PUBLIC_API_BASE_URL')) {
    ordered.push('NEXT_PUBLIC_API_BASE_URL')
    set.delete('NEXT_PUBLIC_API_BASE_URL')
  }
  const rest = [...set].filter((k) => k.startsWith('NEXT_PUBLIC_')).sort()
  ordered.push(...rest)
  return ordered
}

function buildPublicEnvMap(dotenv, stack) {
  const cfg = stack === 'dev' ? DEV : PROD
  const fromFile = {}
  for (const [k, v] of Object.entries(dotenv)) {
    if (!k.startsWith('NEXT_PUBLIC_')) continue
    fromFile[k] = v
  }

  const merged = { ...fromFile }
  if (stack === 'dev') {
    if (merged.NEXT_PUBLIC_STRIPE_TEST_MODE == null || merged.NEXT_PUBLIC_STRIPE_TEST_MODE === '') {
      merged.NEXT_PUBLIC_STRIPE_TEST_MODE = 'true'
    }
    if (!merged.NEXT_PUBLIC_API_BASE_URL) {
      merged.NEXT_PUBLIC_API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? cfg.NEXT_PUBLIC_API_BASE_URL
    }
  } else {
    if (!merged.NEXT_PUBLIC_API_BASE_URL) {
      merged.NEXT_PUBLIC_API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? cfg.NEXT_PUBLIC_API_BASE_URL
    }
  }
  return merged
}

function envToYamlBlock(entries, indent) {
  const pad = ' '.repeat(indent)
  const lines = []
  for (const [name, value] of entries) {
    lines.push(`${pad}- name: ${name}`)
    lines.push(`${pad}  value: "${yamlEscape(value)}"`)
  }
  return lines.join('\n')
}

function render({ dotenv, stack }) {
  const cfg = stack === 'dev' ? DEV : PROD
  const publicMap = buildPublicEnvMap(dotenv, stack)
  const keys = sortPublicKeys(Object.keys(publicMap))
  const publicPairs = keys.map((k) => [k, publicMap[k]])

  const nextauth =
    dotenv.NEXTAUTH_URL || process.env.NEXTAUTH_URL || cfg.NEXTAUTH_URL

  const runFixed = [
    ['NODE_ENV', 'production'],
    ['PORT', '3000'],
    ['HOSTNAME', '0.0.0.0'],
    ['NEXTAUTH_URL', nextauth],
    ['AWS_COGNITO_REGION', 'us-east-2'],
    ['AWS_COGNITO_USER_POOL_ID', cfg.AWS_COGNITO_USER_POOL_ID],
  ]

  const header = `# Generated by scripts/render-apprunner-frontend-dev.mjs — stack=${stack}
# repflow-frontend${stack === 'dev' ? '-dev' : ''}: ${stack === 'dev' ? 'Dev Pool + dev/Repflow-stack' : 'Prod pool + prod/Repflow'}

`

  const buildBlock = envToYamlBlock(publicPairs, 4)
  const runPublicBlock = envToYamlBlock(publicPairs, 4)
  const runTail = envToYamlBlock(runFixed, 4)
  const secrets = runSecretsYaml(cfg.secretBundle)

  return `${header}version: 1.0
runtime: nodejs22
build:
  env:
    # NEXT_PUBLIC_* are embedded at build time
${buildBlock}
  commands:
    build:
      - npm install
      - npm run build
run:
  command: npm run start
  network:
    port: 3000
  env:
${runPublicBlock}
${runTail}
${secrets}
`
}

function main() {
  const { write, stack, envFile } = parseArgs(process.argv)

  if (!fs.existsSync(envFile)) {
    const hint =
      stack === 'dev'
        ? 'Run: npm run stripe:sync:dev'
        : 'Run: npm run stripe:sync (writes .env.local)'
    console.error(`Missing ${envFile}. ${hint}`)
    process.exit(1)
  }

  const dotenv = parseDotenv(fs.readFileSync(envFile, 'utf8'))
  const out = render({ dotenv, stack })

  if (write) {
    const target = path.join(ROOT, 'apprunner.yaml')
    fs.writeFileSync(target, out, 'utf8')
    console.error(`Wrote ${target} (stack=${stack})`)
  } else {
    process.stdout.write(out)
  }
}

main()
